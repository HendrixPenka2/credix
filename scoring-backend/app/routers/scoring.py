"""
Router scoring — predict, simulate, form-schema, history

MODIFICATIONS (refonte 61 dims / BK.1 — août 2026) :

  Réponse API predict — nouveaux champs Flux A (calibration BK.1) :
    pd_c_brute            : float  (PD avant calibration isotonique, diagnostic)
    calibration_appliquee : bool   (False si isotonic_calibrator absent — dégradé)

  Réponse API predict — champs Flux B mis à jour (encodage hybride 61 dims) :
    decision_initiale  : str|null  (décision LightGBM avant escalade, si escalade)
    anomaly_score      : float|null (score du détecteur actif — null si Flux B désactivé)
    is_anomaly         : bool      (score > seuil configuré, P95 par défaut)
    if_escalade        : bool      (le garde-fou a durci la décision)
    if_seuil           : float|null (seuil réellement utilisé)
    if_detecteur       : str|null  ("autoencoder" ou "isolation_forest")
    if_percentile       : int      (95 ou 99, configurable admin)

  Insertions MongoDB : mêmes nouveaux champs propagés dans col_demandes/col_decisions.

  CORRECTIF form-schema (session antérieure, conservé) :
    run_id : admin_config["modele_actif"] → request.app.state.model_run_id
    Garantit que le frontend voit toujours le vrai run_id du modèle en RAM.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.security import require_agent
from app.db.collections import col_clients, col_demandes, col_decisions, col_audit_logs, col_admin_config
from app.services.pipeline_service import run_pipeline
from app.services.percentile_service import calculer_percentile

router = APIRouter(prefix="/api/scoring", tags=["Scoring"])


class ScoringRequest(BaseModel):
    client_id: str
    declaratif: Dict[str, Any]


class SimulationRequest(BaseModel):
    client_id: str
    declaratif: Dict[str, Any]


async def _get_seuils_pdo() -> dict:
    """Lit les seuils PDO depuis MongoDB (configurés par l'admin)."""
    config = await col_admin_config().find_one({"type": "seuils_pdo"})
    if config:
        return {
            "accorde": config.get("accorde", settings.pdo_seuil_accorde),
            "refuse":  config.get("refuse",  settings.pdo_seuil_refuse),
        }
    return {"accorde": settings.pdo_seuil_accorde, "refuse": settings.pdo_seuil_refuse}


async def _get_flux_b_percentile() -> int:
    """Lit le percentile de seuil Flux B (P95/P99) depuis MongoDB (configuré par l'admin)."""
    config = await col_admin_config().find_one({"type": "flux_b_percentile"})
    if config:
        return config.get("percentile", settings.flux_b_percentile_defaut)
    return settings.flux_b_percentile_defaut


# ─────────────────────────────────────────────────────────────────────────────
# GET /form-schema (CORRECTIF run_id)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/form-schema")
async def get_form_schema(request: Request, current_user: dict = Depends(require_agent)):
    """
    Retourne le schéma dynamique du formulaire de saisie.

    Chaque champ contient un flag is_request_specific :
      - True  (Catégorie A) : à saisir à CHAQUE scoring
                              ex : type_contrat, montant_annuite, montant_credit_demande
      - False (Catégorie B) : à saisir UNE FOIS (création client), relu depuis MongoDB ensuite
                              ex : date_naissance, genre, niveau_education

    Le frontend utilise ce flag :
      - Client existant  → afficher uniquement champs A (is_request_specific=True)
      - Nouveau client   → afficher TOUS les champs (A + B)

    CORRECTIF run_id :
      AVANT : lisait admin_config["modele_actif"]["run_id"] → souvent périmé
      APRÈS : lit request.app.state.model_run_id → toujours le run_id réel en RAM
    """
    feature_metadata: dict = request.app.state.feature_metadata
    nap_features: list     = request.app.state.nap_features

    champs_vus = set()
    champs = []

    for feature in nap_features:
        meta = feature_metadata.get(feature, {})

        if not meta.get("is_declarative", False):
            continue

        is_request_specific = meta.get("is_request_specific", False)

        for champ in meta.get("champs_source", []):
            nom = champ.get("nom") if isinstance(champ, dict) else champ

            if nom not in champs_vus:
                champs_vus.add(nom)

                if isinstance(champ, dict):
                    champ_enrichi = dict(champ)
                else:
                    champ_enrichi = {
                        "nom": nom,
                        "label": nom,
                        "type": "number",
                        "obligatoire": True
                    }

                champ_enrichi["is_request_specific"] = is_request_specific
                champs.append(champ_enrichi)

    # CORRECTIF : utiliser le run_id réel depuis app.state (pas admin_config)
    model_run_id = getattr(request.app.state, "model_run_id", "unknown")

    return {
        "champs": champs,
        "run_id": model_run_id,           # ← CORRIGÉ
        "nb_features_modele": len(nap_features)
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /predict (étapes 2.2 + 2.3)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/predict")
async def predict(body: ScoringRequest, request: Request, current_user: dict = Depends(require_agent)):
    """
    Scoring complet — écrit dans MongoDB.

    FLUX A : LightGBM → score_pdo → décision initiale
    FLUX B : IF → anomaly_score → escalade si ACCORDÉ + anomalie
    """
    # Charger le profil client
    client = await col_clients().find_one({"client_id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail=f"Client '{body.client_id}' introuvable.")

    seuils = await _get_seuils_pdo()
    flux_b_percentile = await _get_flux_b_percentile()

    try:
        result = run_pipeline(
            request, client, body.declaratif, seuils,
            top_shap=5, flux_b_percentile=flux_b_percentile,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur pipeline ML : {str(e)}")

    # Percentile
    scores_recents_cursor = col_decisions().find(
        {"timestamp": {"$gte": datetime.now(timezone.utc).replace(day=1)}},
        {"score_pdo": 1, "_id": 0}
    )
    scores_recents = [d["score_pdo"] async for d in scores_recents_cursor]
    percentile_data = calculer_percentile(result["score_pdo"], scores_recents)

    demande_id    = str(uuid.uuid4())
    now           = datetime.now(timezone.utc)
    model_version = getattr(request.app.state, "model_run_id", "unknown")

    # ── ÉTAPE 2.3 — Sauvegarder la demande (avec champs IF) ─────────────────
    await col_demandes().insert_one({
        "demande_id":   demande_id,
        "client_id":    body.client_id,
        "timestamp":    now,
        "agent_id":     current_user["sub"],
        "model_version": model_version,
        "status":       "COMPLETED",
        "input": {
            "declaratif":      body.declaratif,
            "features_woe":    result["vecteur_woe"],
            "features_brutes": result["vecteur_brut"],
        },
        # ── Champs Flux B ─────────────────────────────────────────────────────
        "anomaly_score": result["anomaly_score"],
        "is_anomaly":    result["is_anomaly"],
        "if_escalade":   result["if_escalade"],
        "if_detecteur":  result["if_detecteur"],
        "if_percentile": result["if_percentile"],
        # ── Champs calibration BK.1 ───────────────────────────────────────────
        "pd_c_brute":            result["pd_c_brute"],
        "calibration_appliquee": result["calibration_appliquee"],
    })

    # ── ÉTAPE 2.3 — Sauvegarder la décision (avec champs IF) ────────────────
    # decision_initiale.valeur = décision LightGBM avant IF
    #   Si escalade : result["decision_initiale"] = "ACCORDÉ"
    #   Sinon       : result["decision_initiale"] = None → on utilise result["decision"]
    decision_lgbm = result["decision_initiale"] or result["decision"]

    await col_decisions().insert_one({
        "demande_id":   demande_id,
        "client_id":    body.client_id,
        "agent_id":     current_user["sub"],          # ← LIGNE AJOUTÉE
        "timestamp":    now,
        "pd_c":         result["pd_c"],
        "score_pdo":    result["score_pdo"],
        "decision_initiale": {"valeur": decision_lgbm},
        "decision_finale":   {"valeur": result["decision"]},
        "rho_c":        result["rho_c"],
        "rho_detail":   result["rho_detail"],
        "shap_top5":    result["shap_top"],
        "recommandation_rho": result["recommandation_rho"],
        "percentile":   percentile_data,
        "override_superviseur": False,
        "model_version": model_version,
        "anomaly_score":       result["anomaly_score"],
        "is_anomaly":          result["is_anomaly"],
        "if_escalade":         result["if_escalade"],
        "if_detecteur":        result["if_detecteur"],
        "if_percentile":       result["if_percentile"],
        "decision_avant_if":   result["decision_initiale"],
        "pd_c_brute":            result["pd_c_brute"],
        "calibration_appliquee": result["calibration_appliquee"],
    })

    # Mettre à jour le profil client
    await col_clients().update_one(
        {"client_id": body.client_id},
        {"$set": {
            "updated_at": now,
            "is_new_client": False,          # ← NOUVEAU
            "last_score": {
                "score_pdo":        result["score_pdo"],
                "decision":         result["decision"],
                "pd_c":             result["pd_c"],
                "date":             now,
                "demande_id":       demande_id,      # ← NOUVEAU
                "anomaly_score":    result["anomaly_score"],   # ← NOUVEAU
                "is_anomaly":       result["is_anomaly"],      # ← NOUVEAU
                "if_escalade":      result["if_escalade"],     # ← NOUVEAU
                "if_seuil":         result["if_seuil"],        # ← NOUVEAU
                "decision_initiale": result["decision_initiale"],   # ← correct
            },
            "coverage.rho":                 result["rho_c"],
            "coverage.sources_disponibles": result["rho_detail"]["sources_disponibles"],
            "coverage.sources_manquantes":  result["rho_detail"]["sources_manquantes"],
        }}
    )

    # ── ÉTAPE 2.3 — Audit log (avec détails IF si escalade) ─────────────────
    audit_details = {
        "decision":  result["decision"],
        "score":     result["score_pdo"],
    }
    if result["if_escalade"]:
        # Si IF a escaladé la décision → tracer dans l'audit
        audit_details["if_escalade"]        = True
        audit_details["decision_initiale"]  = result["decision_initiale"]
        audit_details["anomaly_score"]      = result["anomaly_score"]

    await col_audit_logs().insert_one({
        "timestamp":    now,
        "user_id":      current_user["sub"],
        "user_role":    current_user.get("role"),
        "action":       "SCORING_REQUEST",
        "ressource":    "demandes",
        "ressource_id": demande_id,
        "ip_address":   "internal",
        "statut":       "SUCCES",
        "details":      audit_details,
    })

    # ── Réponse API ────────────────────────────────────────────────────────
    return {
        # ── Champs Flux A ─────────────────────────────────────────────────────
        "demande_id":        demande_id,
        "client_id":         body.client_id,
        "pd_c":              result["pd_c"],
        "score_pdo":         result["score_pdo"],
        "decision":          result["decision"],
        "rho_c":             result["rho_c"],
        "shap_top5":         result["shap_top"],
        "recommandation_rho": result["recommandation_rho"],
        "percentile":        percentile_data,
        "model_version":     model_version,
        "timestamp":         now.isoformat(),
        # ── Calibration BK.1 ─────────────────────────────────────────────────
        "pd_c_brute":            result["pd_c_brute"],
        "calibration_appliquee": result["calibration_appliquee"],
        # ── Champs Flux B (garde-fou anomalie, 61 dims) ──────────────────────
        "decision_initiale": result["decision_initiale"],  # null si pas d'escalade
        "anomaly_score":     result["anomaly_score"],
        "is_anomaly":        result["is_anomaly"],
        "if_escalade":       result["if_escalade"],
        "if_seuil":          result["if_seuil"],
        "if_detecteur":      result["if_detecteur"],
        "if_percentile":     result["if_percentile"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /simulate (pas d'écriture MongoDB — le Flux B tourne mais n'est pas tracé)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/simulate")
async def simulate(body: SimulationRequest, request: Request, current_user: dict = Depends(require_agent)):
    """
    Simulation what-if — pas d'écriture MongoDB, SHAP simplifié (top 3).
    Le Flux B (AE/IF) est exécuté mais non sauvegardé (simulation = pas de trace).
    """
    client = await col_clients().find_one({"client_id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail=f"Client '{body.client_id}' introuvable")

    seuils = await _get_seuils_pdo()
    flux_b_percentile = await _get_flux_b_percentile()

    try:
        result = run_pipeline(
            request, client, body.declaratif, seuils,
            top_shap=3, flux_b_percentile=flux_b_percentile,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur simulation : {str(e)}")

    await col_audit_logs().insert_one({
        "timestamp":    datetime.now(timezone.utc),
        "user_id":      current_user["sub"],
        "user_role":    current_user.get("role"),
        "action":       "SIMULATE_REQUEST",
        "ressource":    "simulations",
        "ressource_id": body.client_id,
        "ip_address":   "internal",
        "statut":       "SUCCES",
        "details":      {"score_simule": result["score_pdo"]},
    })

    return {
        "pd_c":                  result["pd_c"],
        "pd_c_brute":            result["pd_c_brute"],
        "calibration_appliquee": result["calibration_appliquee"],
        "score_pdo":     result["score_pdo"],
        "decision":      result["decision"],
        "rho_c":         result["rho_c"],
        "recommandation_rho": result["recommandation_rho"],
        "shap_top3":     result["shap_top"],
        "is_simulation": True,
        # Flux B inclus dans la simulation pour que l'agent voie l'impact potentiel
        "anomaly_score": result["anomaly_score"],
        "is_anomaly":    result["is_anomaly"],
        "if_escalade":   result["if_escalade"],
        "if_detecteur":  result["if_detecteur"],
        "if_percentile": result["if_percentile"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /history/{client_id} (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/history/{client_id}")
async def get_history(client_id: str, limit: int = 20, current_user: dict = Depends(require_agent)):
    """Historique des demandes d'un client."""
    pipeline = [
        {"$match":  {"client_id": client_id}},
        {"$sort":   {"timestamp": 1}},
        {"$limit":  limit},
        {"$lookup": {
            "from":         "decisions",
            "localField":   "demande_id",
            "foreignField": "demande_id",
            "as":           "decision"
        }},
        {"$unwind": {"path": "$decision", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id":               0,
            "demande_id":        1,
            "timestamp":         1,
            "score_pdo":         "$decision.score_pdo",
            "decision":          "$decision.decision_finale.valeur",
            "decision_initiale": "$decision.decision_initiale.valeur",
            "pd_c":              "$decision.pd_c",
            "rho_c":             "$decision.rho_c",
            "shap_top5":         "$decision.shap_top5",
            "if_escalade":       "$decision.if_escalade",
            "anomaly_score":     "$decision.anomaly_score",
            "is_anomaly":        "$decision.is_anomaly",
            "decision_avant_if": "$decision.decision_avant_if",
            "model_version":     "$decision.model_version",
        }}
    ]
    historique = await col_demandes().aggregate(pipeline).to_list(limit)
    return {"client_id": client_id, "historique": historique, "total": len(historique)}