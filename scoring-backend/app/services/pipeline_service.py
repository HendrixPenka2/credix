"""
Service Pipeline ML — orchestration complète de l'inférence

REFONTE (BK.1 + Flux B 61 dims — août 2026) :
  - calibration isotonique insérée entre predict_proba et le score PDO (BK.1)
  - Flux B reconstruit sur l'espace hybride 61 dims (encoder_hybrid.pkl) au lieu
    du Frequency Encoding 27 dims — AE = détecteur principal, IF = repli, tous
    deux évalués sur le MÊME encodage (cf. RAPPORT_FLUXB_61DIMS.md, N.30)
  - seuil Flux B configurable P95/P99 (percentile transmis par scoring.py)
  - message contextuel Cas 4 (Ïc<0,25 + score acceptable malgré tout)
  - retrait des print [DIAG] de debug (ETAT_MEMOIRE note 8)
"""
import pandas as pd
import numpy as np
from datetime import date
from fastapi import Request
from app.services.rho_service import calculer_rho, generer_recommandation
from app.services.shap_service import calculer_shap, generer_phrase_shap
from app.services.pdo_service import pd_to_score, get_decision
from app.services.calibration_service import calibrer_pd
from app.core.config import settings


def evaluer_formule(formule: str, valeurs: dict) -> float:
    if not formule:
        return None
    try:
        expr = formule
        for cle, val in valeurs.items():
            # Ignore les clés qui n'apparaissent pas dans cette formule
            # (ex: "type_contrat" n'a rien à faire dans "montant_annuite / montant_credit_demande")
            if cle not in expr:
                continue
            if val is None:
                return None
            try:
                expr = expr.replace(cle, str(float(val)))
            except (TypeError, ValueError):
                # Cette valeur précise n'est pas numérique → formule inévaluable
                return None
        return float(eval(expr))  # noqa: S307
    except Exception:
        return None


def _calculer_age_depuis_date(date_str: str) -> float:
    if not date_str:
        return None
    try:
        dob = date.fromisoformat(str(date_str))
        return (date.today() - dob).days / 365.25
    except (ValueError, TypeError):
        return None


def assembler_vecteur(
    profil_client: dict,
    valeurs_saisies: dict,
    feature_metadata: dict,
    nap_features: list
) -> dict:
    """
    Assemble le vecteur de features pour l'inférence.
    Catégorie A : depuis valeurs_saisies (chaque scoring)
    Catégorie B : valeurs_saisies priorité, sinon MongoDB
    Catégorie C : toujours depuis MongoDB (ETL)
    """
    features_mongodb = profil_client.get("features", {})
    profil = profil_client.get("profile", {})
    vecteur = {}

    for feature in nap_features:
        meta = feature_metadata.get(feature, {})
        is_declarative = meta.get("is_declarative", False)

        if is_declarative:
            formule = meta.get("formule")
            champs  = meta.get("champs_source", [])

            if feature == "age_years":
                dn = valeurs_saisies.get("date_naissance")
                if not dn:
                    dn = profil.get("date_naissance")
                age = _calculer_age_depuis_date(dn)
                vecteur[feature] = age if age is not None else features_mongodb.get(feature)
                continue

            if formule:
                val = evaluer_formule(formule, valeurs_saisies)
                vecteur[feature] = val if val is not None else features_mongodb.get(feature)
                continue

            if champs:
                nom_champ = champs[0].get("nom") if isinstance(champs[0], dict) else champs[0]
                val_saisie = valeurs_saisies.get(nom_champ)
                vecteur[feature] = val_saisie if val_saisie is not None else features_mongodb.get(feature)
            else:
                vecteur[feature] = features_mongodb.get(feature)
        else:
            vecteur[feature] = features_mongodb.get(feature)

    return vecteur


# ─────────────────────────────────────────────────────────────────────────────
# FLUX B — détection d'anomalie, espace hybride 61 dims
# ─────────────────────────────────────────────────────────────────────────────
# Pipeline commun AE + IF (cf. RAPPORT_FLUXB_61DIMS.md, encodage validé N.31/N.53) :
#   27 features brutes → 20 numériques (médiane train + StandardScaler)
#                       + 7 catégorielles (4 One-Hot simple / 2 One-Hot+"Unknown"
#                         / 1 Frequency = ORGANIZATION_TYPE)
#                       → réindexation selon colonnes_ordonnees_61.json["ordre"]
# AE et IF partagent EXACTEMENT ce vecteur 61 dims (même encoder_hybrid.pkl,
# même scaler_if.pkl) — seule la transformation du score diffère ensuite.

_GENDER_MAP = {'M': 1.0, 'F': 0.0, 'm': 1.0, 'f': 0.0}


def _construire_vecteur_hybride(vecteur_brut: dict, app_state) -> np.ndarray | None:
    """
    Construit le vecteur d'entrée (1, 61) du Flux B à partir des 27 features brutes.

    encoder_hybrid.pkl est une classe custom Kaggle (HybridCategoricalEncoder,
    non disponible dans ce runtime — cf. app/main.py, _ArtefactsUnpickler). On
    n'appelle donc jamais de méthode dessus : on relit directement ses
    composants déjà ajustés (deux sklearn.OneHotEncoder réels + une table de
    fréquences) et on reproduit nous-mêmes la logique de transformation.

    Retourne un array (1, 61) dans l'ordre colonnes_ordonnees_61.json, ou None
    si un artefact manque / une erreur survient (jamais d'exception propagée —
    l'appelant traite None comme "Flux B indisponible pour ce client").
    """
    try:
        scaler_bundle = app_state.scaler_if
        scaler        = scaler_bundle["scaler"]
        medians       = scaler_bundle["medians"]
        features_num  = scaler_bundle["features"]
        encoder       = app_state.encoder_hybrid
        ordre_61      = app_state.colonnes_ordonnees_61["ordre"]

        # 1. Numériques (20) : imputation médiane (train) + StandardScaler
        X_num = []
        for f in features_num:
            val = vecteur_brut.get(f)
            if val is None or (isinstance(val, float) and np.isnan(val)):
                val = medians.get(f, 0.0)
            try:
                X_num.append(float(val))
            except (ValueError, TypeError):
                X_num.append(_GENDER_MAP.get(str(val), medians.get(f, 0.0)))
        X_num_scaled = scaler.transform([X_num])[0]
        merged: dict = dict(zip(features_num, X_num_scaled))

        # 2. Catégorielles — One-Hot simple (pas de NaN attendu sur ces variables :
        #    NAME_EDUCATION_TYPE, NAME_CONTRACT_TYPE, CODE_GENDER, NAME_INCOME_TYPE)
        if encoder.cols_oh_simple:
            cols = list(encoder.oh_simple_.feature_names_in_)
            X_simple = [[str(vecteur_brut.get(c, "")) for c in cols]]
            enc_simple = encoder.oh_simple_.transform(X_simple)[0]
            merged.update(zip(encoder.oh_simple_.get_feature_names_out(), enc_simple))

        # 3. Catégorielles — One-Hot + catégorie "Unknown" explicite
        #    (OCCUPATION_TYPE, EMERGENCYSTATE_MODE — NaN/valeur absente → "Unknown",
        #    la même convention qu'à l'entraînement du notebook)
        if encoder.cols_oh_unknown:
            cols = list(encoder.oh_unknown_.feature_names_in_)
            X_unknown = []
            for c in cols:
                val = vecteur_brut.get(c)
                if val is None or (isinstance(val, float) and np.isnan(val)) or str(val).strip() == "":
                    val = "Unknown"
                X_unknown.append(str(val))
            enc_unknown = encoder.oh_unknown_.transform([X_unknown])[0]
            merged.update(zip(encoder.oh_unknown_.get_feature_names_out(), enc_unknown))

        # 4. Catégorielle — Frequency Encoding (ORGANIZATION_TYPE, 58 modalités)
        freq = encoder.freq_
        for c in encoder.cols_frequency:
            val = vecteur_brut.get(c)
            if val is None:
                merged[c] = freq.nan_freqs_.get(c, 0.0)
            else:
                merged[c] = freq.freq_maps_.get(c, {}).get(str(val), freq.nan_freqs_.get(c, 0.0))

        # 5. Réindexation dans l'ordre exact attendu par l'AE / l'IF (source de
        #    vérité : colonnes_ordonnees_61.json, jamais un ordre supposé)
        return np.array([[float(merged.get(f, 0.0)) for f in ordre_61]])

    except Exception as e:
        print(f"[WARNING] Erreur construction vecteur hybride 61 dims : {e}")
        return None


def _appliquer_ae(vecteur_brut: dict, app_state, percentile: int) -> dict:
    """
    Détection d'anomalie par Autoencodeur (détecteur PRINCIPAL, 61 dims).

    Score = log1p(MSE de reconstruction), sur l'ÉCHELLE BRUTE (pas de min-max).
    Le min-max n'est utile que pour l'affichage comparatif dans le notebook ;
    un seuil de décision calé sur une échelle qui dépend du min/max observé se
    périmerait au premier client hors bornes. log1p seul ne change pas l'ORDRE
    des clients (transformation monotone) — aucune perte de détection, juste un
    seuil stable dans le temps (cf. RAPPORT_FLUXB_61DIMS.md §27.5, §29).
    """
    try:
        X_61 = _construire_vecteur_hybride(vecteur_brut, app_state)
        if X_61 is None:
            raise ValueError("vecteur hybride indisponible")

        ae_metadata = app_state.ae_metadata
        seuil = ae_metadata[f"seuil_ae_p{percentile}"]

        X_recon = app_state.autoencoder.predict(X_61, verbose=0)
        mse = float(np.mean((X_61 - X_recon) ** 2))
        anomaly_score = float(np.log1p(mse))
        is_anomaly = anomaly_score > seuil

        return {
            "anomaly_score": round(anomaly_score, 6),
            "is_anomaly":    bool(is_anomaly),
            "if_escalade":   False,
            "detecteur":     "autoencoder",
            "percentile":    percentile,
        }

    except Exception as e:
        print(f"[WARNING] Flux B AE échoué : {e} — is_anomaly=False par défaut")
        return {"anomaly_score": None, "is_anomaly": False, "if_escalade": False,
                "detecteur": None, "percentile": percentile}


def _appliquer_if(vecteur_brut: dict, app_state, percentile: int) -> dict:
    """
    Détection d'anomalie par Isolation Forest (REPLI si l'AE est indisponible).
    Ré-entraîné sur le MÊME espace hybride 61 dims que l'AE (N.30) — plus
    l'ancien encodage Frequency-27 dims dédié à l'IF.

    Score = -decision_function (échelle brute, cohérent avec le seuil calibré ;
    "haut = anormal", même convention que le score AE).
    """
    try:
        X_61 = _construire_vecteur_hybride(vecteur_brut, app_state)
        if X_61 is None:
            raise ValueError("vecteur hybride indisponible")

        if_metadata = app_state.if_metadata
        seuil = if_metadata[f"seuil_if_p{percentile}"]

        anomaly_score = -float(app_state.isolation_forest.decision_function(X_61)[0])
        is_anomaly = anomaly_score > seuil

        return {
            "anomaly_score": round(anomaly_score, 6),
            "is_anomaly":    bool(is_anomaly),
            "if_escalade":   False,
            "detecteur":     "isolation_forest",
            "percentile":    percentile,
        }

    except Exception as e:
        print(f"[WARNING] Flux B IF échoué : {e} — is_anomaly=False par défaut")
        return {"anomaly_score": None, "is_anomaly": False, "if_escalade": False,
                "detecteur": None, "percentile": percentile}


def appliquer_flux_b(vecteur_brut: dict, app_state, percentile: int = 95) -> dict:
    """
    Flux B — Détection d'anomalie (garde-fou non supervisé).
    Priorité : Autoencodeur (principal) → Isolation Forest (repli) → Désactivé.

    percentile : 95 ou 99, seuil configuré par l'admin (cf. app/routers/admin.py,
    admin_config["flux_b_percentile"]). Défaut P95 (couverture large, ~5% FP).
    """
    if (app_state.autoencoder is not None
            and app_state.scaler_if is not None
            and app_state.encoder_hybrid is not None
            and app_state.colonnes_ordonnees_61 is not None
            and app_state.ae_metadata is not None):
        return _appliquer_ae(vecteur_brut, app_state, percentile)

    if (app_state.isolation_forest is not None
            and app_state.scaler_if is not None
            and app_state.encoder_hybrid is not None
            and app_state.colonnes_ordonnees_61 is not None
            and app_state.if_metadata is not None):
        return _appliquer_if(vecteur_brut, app_state, percentile)

    return {"anomaly_score": None, "is_anomaly": False, "if_escalade": False,
            "detecteur": None, "percentile": percentile}


# ─────────────────────────────────────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(
    request: Request,
    profil_client: dict,
    valeurs_saisies: dict,
    seuils_pdo: dict,
    top_shap: int = 5,
    flux_b_percentile: int = 95,
) -> dict:
    """
    Pipeline ML complet.

    FLUX A : vecteur_brut → ρc → WOE → LightGBM → PD brute → PD calibrée (BK.1)
             → score_pdo → décision_initiale
    FLUX B : vecteur_brut → encodage hybride 61 dims → AE (ou IF en repli)
             → anomaly_score → escalade si ACCORDÉ + anomalie
    """
    state = request.app.state
    feature_metadata: dict  = state.feature_metadata
    nap_features: list      = state.nap_features
    woe_transformers        = state.woe_transformers
    lgbm_model              = state.lgbm_model
    iv_scores: pd.DataFrame = state.iv_scores
    isotonic_calibrator     = getattr(state, "isotonic_calibrator", None)

    # ① Vecteur brut
    vecteur_brut = assembler_vecteur(
        profil_client, valeurs_saisies, feature_metadata, nap_features
    )

    # ② ρc (sur vecteur brut — vrais NaN)
    rho_data = calculer_rho(vecteur_brut, iv_scores)
    rho_c = rho_data["rho"]

    # ③ WOE
    vecteur_woe = {}
    for feature, valeur in vecteur_brut.items():
        transformer = woe_transformers.get(feature)
        if transformer is not None:
            try:
                val_array = np.array([valeur if valeur is not None else np.nan])
                woe_val = float(transformer.transform(val_array)[0])
                vecteur_woe[feature] = woe_val
            except Exception:
                vecteur_woe[feature] = 0.0
        else:
            vecteur_woe[feature] = valeur if valeur is not None else 0.0

    # ④ DataFrame LightGBM
    X_input = pd.DataFrame([vecteur_woe])[nap_features]

    # ⑤ LightGBM → PD brute → PD calibrée (BK.1 — isotonic, transformation
    #    monotone : ne change ni l'AUC ni le classement, corrige l'échelle)
    pd_brute = float(lgbm_model.predict_proba(X_input)[0][1])
    pd_c = calibrer_pd(pd_brute, isotonic_calibrator)
    calibration_appliquee = isotonic_calibrator is not None
    if not calibration_appliquee:
        print("[WARNING] PD non calibrée (isotonic_calibrator absent) — "
              f"pd_brute={pd_brute:.4f} utilisée telle quelle, score/décision dégradés")

    # ⑥ SHAP (sur le modèle brut — la calibration est une transformation APRÈS
    #    le modèle, elle ne touche pas les valeurs SHAP, cf. RAPPORT_BK1 §1.5)
    shap_raw = calculer_shap(lgbm_model, X_input, top_n=top_shap)
    total_shap_abs = sum(abs(item["shap_value"]) for item in shap_raw)
    shap_enrichi = []
    for item in shap_raw:
        phrase = generer_phrase_shap(
            feature=item["feature"],
            shap_value=item["shap_value"],
            valeur_brute=vecteur_brut.get(item["feature"]),
            feature_metadata=feature_metadata,
            total_shap_abs=total_shap_abs,
        )
        shap_enrichi.append(phrase)

    # ⑦ Score PDO (sur la PD calibrée)
    score = pd_to_score(pd_c)

    # ⑧ Décision initiale LightGBM
    decision_initiale = get_decision(score, rho_c, seuils_pdo)

    # ⑨ Recommandation documentaire (+ message Cas 4 : Ïc<seuil_revue_forcee
    #    mais score acceptable — la décision automatique n'est PAS retenue seule)
    recommandation = generer_recommandation(
        rho_data, feature_metadata, rho_c,
        score=score, seuil_accorde=seuils_pdo.get("accorde", settings.pdo_seuil_accorde),
    )

    # ─────────────────────────────────────────────────────────────────────────
    # ⑩ FLUX B — garde-fou anomalie (désactivé si Ïc < 0,25 : features imputées
    #    en masse → faux positifs systématiques, cf. §3.12/§4.6 methodologie)
    # ─────────────────────────────────────────────────────────────────────────
    if rho_c >= settings.rho_seuil_revue_forcee:
        if_result = appliquer_flux_b(vecteur_brut, state, flux_b_percentile)
    else:
        if_result = {"anomaly_score": None, "is_anomaly": False, "if_escalade": False,
                      "detecteur": None, "percentile": flux_b_percentile}

    # Règle d'escalade : le garde-fou ne peut QU'ESCALADER — jamais diminuer une décision
    #   ACCORDÉ  + anomalie → REVUE_MANUELLE ✓
    #   REFUSÉ   + anomalie → REFUSÉ (déjà pire décision)
    #   REVUE    + anomalie → REVUE (déjà en revue)
    if_escalade       = False
    decision_finale   = decision_initiale
    decision_avant_if = None  # renseigné uniquement si escalade effective

    if if_result["is_anomaly"] and decision_initiale == "ACCORDE":
        decision_finale   = "REVUE_MANUELLE"
        if_escalade       = True
        decision_avant_if = decision_initiale
        print(f"[Flux B] Escalade : ACCORDÉ → REVUE_MANUELLE "
              f"(detecteur={if_result['detecteur']}, anomaly_score={if_result['anomaly_score']})")

    # Seuil affiché = celui réellement utilisé par le détecteur actif
    if state.autoencoder is not None and getattr(state, "ae_metadata", None) is not None:
        if_seuil = state.ae_metadata.get(f"seuil_ae_p{flux_b_percentile}")
    elif getattr(state, "if_metadata", None) is not None:
        if_seuil = state.if_metadata.get(f"seuil_if_p{flux_b_percentile}")
    else:
        if_seuil = None

    return {
        # ── Flux A ───────────────────────────────────────────────────────────
        "pd_c"                  : round(pd_c, 6),
        "pd_c_brute"            : round(pd_brute, 6),
        "calibration_appliquee" : calibration_appliquee,
        "score_pdo"             : score,
        "decision"              : decision_finale,
        "rho_c"                 : rho_c,
        "rho_detail"            : rho_data,
        "shap_top"              : shap_enrichi,
        "recommandation_rho"    : recommandation,
        "vecteur_woe"           : vecteur_woe,
        "vecteur_brut"          : vecteur_brut,
        # ── Flux B ───────────────────────────────────────────────────────────
        "anomaly_score"         : if_result["anomaly_score"],
        "is_anomaly"            : if_result["is_anomaly"],
        "if_escalade"           : if_escalade,
        "decision_initiale"     : decision_avant_if,
        "if_seuil"              : if_seuil,
        "if_detecteur"          : if_result["detecteur"],
        "if_percentile"         : if_result["percentile"],
    }
