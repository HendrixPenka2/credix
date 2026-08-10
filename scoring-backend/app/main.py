"""
Application FastAPI — Scoring de Risque de Crédit
ENSPY GI2026 / IT Nearshore — Singhe Penka Hendrix Donavan (21P05A)

MODIFIÉ (refonte 61 dims / BK.1 — août 2026) :
  - charger_artefacts : 14 artefacts (Flux A + calibration isotonique BK.1 +
    Flux B refondu sur l'encodage hybride 61 dims), GridFS + fallback seed
  - calibration       : isotonic_calibrator.pkl appliqué sur predict_proba
    (cf. app/services/calibration_service.py)
  - décision          : seuils par défaut sourcés depuis decision_config.json
    (Jeu 2 : PD<10% ACCORDÉ / PD>30% REFUSÉ, équiv. score ≈578,5/≈539,5)
  - Flux B            : encoder_if.pkl (Frequency, 27 dims) retiré, remplacé
    par encoder_hybrid.pkl (One-Hot + Unknown + Frequency, 61 dims), utilisé
    par l'AE (détecteur principal) ET l'IF (repli) — cf. RAPPORT_FLUXB_61DIMS
  - /health           : expose l'état de la calibration + de l'encodage 61 dims
  - CORRECTIF         : custom unpickler pour les classes Kaggle absentes du
    runtime backend (FrequencyEncoder interne, HybridCategoricalEncoder)
"""
import os
import json
import pickle
import shutil
import joblib
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import connect_db, disconnect_db, get_db
from app.db.gridfs import telecharger_artefact


# ─────────────────────────────────────────────────────────────────────────────
# CORRECTIF classes custom Kaggle absentes du runtime backend
# ─────────────────────────────────────────────────────────────────────────────
# encoder_hybrid.pkl a été sérialisé dans le notebook avec une classe
# personnalisée HybridCategoricalEncoder (qui embarque elle-même une
# FrequencyEncoder pour ORGANIZATION_TYPE). Ces classes n'existent pas dans le
# backend. Solution : un unpickler substitutif qui redirige ces noms vers des
# stubs génériques ne portant que __setstate__ — le pipeline lit ensuite leurs
# attributs directement (cols_oh_simple, oh_simple_, freq_.freq_maps_, ...),
# jamais leurs méthodes .transform() d'origine. Structure vérifiée à la main
# sur l'artefact réel avant d'écrire ce code (cf. échange du 05/08/2026) :
#   HybridCategoricalEncoder :
#     cols_oh_simple  : liste des variables en One-Hot simple (pas de NaN)
#     cols_oh_unknown : liste des variables en One-Hot + catégorie "Unknown"
#     cols_frequency  : liste des variables en Frequency Encoding (ORGANIZATION_TYPE)
#     oh_simple_      : sklearn.OneHotEncoder ajusté (handle_unknown='ignore')
#     oh_unknown_     : sklearn.OneHotEncoder ajusté, NaN mappé sur "Unknown" au fit
#     freq_           : FrequencyEncoder (freq_maps_, nan_freqs_, columns_)

class _FrequencyEncoderStub:
    """Substitut pour FrequencyEncoder (composant interne de HybridCategoricalEncoder)."""
    def __setstate__(self, state):
        self.__dict__.update(state)


class _HybridCategoricalEncoderStub:
    """Substitut pour HybridCategoricalEncoder (encodage catégoriel Flux B, 61 dims)."""
    def __setstate__(self, state):
        self.__dict__.update(state)


class _ArtefactsUnpickler(pickle.Unpickler):
    """
    Unpickler substitutif : redirige les classes custom Kaggle vers leurs stubs.
    Toutes les autres classes (sklearn, numpy...) sont gérées normalement.
    """
    _STUBS = {
        "FrequencyEncoder":          _FrequencyEncoderStub,
        "HybridCategoricalEncoder":  _HybridCategoricalEncoderStub,
    }

    def find_class(self, module: str, name: str):
        if name in self._STUBS:
            return self._STUBS[name]
        return super().find_class(module, name)


# ─────────────────────────────────────────────────────────────────────────────
# TABLE DES 14 ARTEFACTS
# ─────────────────────────────────────────────────────────────────────────────
# (nom_fichier_gridfs, nom_app_state, loader)
# Flux A (5)            : pipeline scoring supervisé (WOE → NAP → LightGBM)
# Flux A — BK.1 (2)      : calibration isotonique + config de décision (Jeu 2)
# Flux B — refonte (7)   : garde-fou anomalie sur l'espace hybride 61 dims
#                          (AE = détecteur principal, IF = repli)
# "pickle_hybrid" = loader spécial pour encoder_hybrid.pkl (classes custom Kaggle)

_ARTEFACTS = [
    # ── Flux A (5) ───────────────────────────────────────────────────────────
    ("woe_transformers.pkl",       "woe_transformers",      "joblib"),
    ("nap_features.pkl",           "nap_features",          "joblib"),
    ("lgbm_final.pkl",             "lgbm_model",            "joblib"),
    ("iv_scores_final.csv",        "iv_scores",             "csv"),
    ("feature_stats.json",         "feature_stats",         "json"),
    # ── Flux A — BK.1 : calibration + décision (2) ──────────────────────────
    ("isotonic_calibrator.pkl",    "isotonic_calibrator",   "joblib"),
    ("decision_config.json",       "decision_config",       "json"),
    # ── Flux B — encodage hybride 61 dims, partagé AE + IF (7) ──────────────
    ("autoencoder.keras",          "autoencoder",           "keras"),
    ("ae_metadata.json",           "ae_metadata",            "json"),
    ("isolation_forest.pkl",       "isolation_forest",      "pickle"),
    ("if_metadata.json",           "if_metadata",           "json"),
    ("scaler_if.pkl",              "scaler_if",             "pickle"),
    ("encoder_hybrid.pkl",         "encoder_hybrid",        "pickle_hybrid"),
    ("colonnes_ordonnees_61.json", "colonnes_ordonnees_61", "json"),
]

# Artefacts optionnels en mode seed (dégradation propre si absents, jamais de crash) :
#   - Flux B : garde-fou désactivé si absent (comportement déjà en place)
#   - Calibration/décision BK.1 : PD non calibrée + seuils de repli settings.py
#     si absents (dégradé mais fonctionnel — jamais silencieux, cf. /health)
_ARTEFACTS_IF = {
    "autoencoder", "ae_metadata", "isolation_forest", "if_metadata",
    "scaler_if", "encoder_hybrid", "colonnes_ordonnees_61",
}
_ARTEFACTS_CALIBRATION = {"isotonic_calibrator", "decision_config"}
_ARTEFACTS_OPTIONNELS = _ARTEFACTS_IF | _ARTEFACTS_CALIBRATION


def _charger_fichier(nom_state: str, chemin: str, loader: str, app: FastAPI):
    """
    Charge un fichier en RAM et l'affecte à app.state.{nom_state}.

    Loaders disponibles :
      joblib        → joblib.load() — woe_transformers, nap_features, lgbm_model,
                       isotonic_calibrator (sklearn.isotonic.IsotonicRegression, standard)
      pickle        → pickle.load() standard — isolation_forest, scaler_if
      pickle_hybrid → _ArtefactsUnpickler — encoder_hybrid (classes custom Kaggle)
      csv           → pd.read_csv() — iv_scores
      json          → json.load() — feature_stats, if_metadata, ae_metadata,
                       decision_config, colonnes_ordonnees_61
    """
    if loader == "joblib":
        setattr(app.state, nom_state, joblib.load(chemin))

    elif loader == "pickle":
        with open(chemin, "rb") as f:
            setattr(app.state, nom_state, pickle.load(f))

    elif loader == "pickle_hybrid":
        # Utilise le custom unpickler pour gérer les classes Kaggle absentes du backend
        with open(chemin, "rb") as f:
            setattr(app.state, nom_state, _ArtefactsUnpickler(f).load())

    elif loader == "csv":
        setattr(app.state, nom_state, pd.read_csv(chemin))

    elif loader == "json":
        with open(chemin, "r", encoding="utf-8") as f:
            setattr(app.state, nom_state, json.load(f))
    elif loader == "keras":
        # Import local pour éviter le chargement au démarrage si TF absent
        from tensorflow import keras as tf_keras
        setattr(app.state, nom_state, tf_keras.models.load_model(chemin))


# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1.3 — charger_artefacts
# ─────────────────────────────────────────────────────────────────────────────
async def charger_artefacts(app: FastAPI, run_id: str = None):
    """
    Charge les 14 artefacts ML en mémoire RAM.

    DEUX MODES :
    ┌─────────────────────────────────────────────────────────────────────┐
    │ run_id fourni  → MODE GRIDFS                                        │
    │   Télécharge depuis GridFS → /tmp/artefacts/{run_id}/ → RAM        │
    │   Nettoie /tmp/ dans tous les cas (finally).                        │
    ├─────────────────────────────────────────────────────────────────────┤
    │ run_id absent  → MODE SEED (fallback)                               │
    │   Charge depuis settings.artefacts_dir (./artefacts/).              │
    └─────────────────────────────────────────────────────────────────────┘
    Dans les deux modes, un artefact OPTIONNEL absent (Flux B ou calibration
    BK.1 — cf. _ARTEFACTS_OPTIONNELS) déclenche un WARNING + None, jamais un
    crash : ça permet de promouvoir un ancien run_id (11 artefacts, sans BK.1)
    en dégradé plutôt que de bloquer la promotion. Un artefact Flux A de base
    manquant reste, lui, bloquant (FileNotFoundError).
    """

    # ── MODE MOCK ────────────────────────────────────────────────────────────
    if settings.use_mock_artefacts:
        from mock.mock_artefacts import get_mock_artefacts
        mock = get_mock_artefacts()
        app.state.woe_transformers = mock["woe_transformers"]
        app.state.nap_features     = mock["nap_features"]
        app.state.lgbm_model       = mock["lgbm_model"]
        app.state.iv_scores        = mock["iv_scores"]
        app.state.feature_stats    = mock["feature_stats"]
        for nom_state in _ARTEFACTS_OPTIONNELS:
            setattr(app.state, nom_state, None)
        app.state.model_run_id     = "mock-run-v1"
        print("[MOCK] Artefacts factices chargés — Flux B désactivé, PD non calibrée")
        return

    # ────────────────────────────────────────────────────────────────────────
    if run_id:
        # ── MODE GRIDFS ──────────────────────────────────────────────────────
        print(f"[Artefacts] Mode GridFS — run_id={run_id}")
        tmp_dir = f"/tmp/artefacts/{run_id}"
        os.makedirs(tmp_dir, exist_ok=True)
        nb_charges = 0

        try:
            for nom_fichier, nom_state, loader in _ARTEFACTS:
                try:
                    contenu = await telecharger_artefact(run_id, nom_fichier)
                except FileNotFoundError:
                    if nom_state in _ARTEFACTS_OPTIONNELS:
                        setattr(app.state, nom_state, None)
                        print(f"[WARNING] Artefact optionnel absent de GridFS : {nom_fichier} → None")
                        continue
                    raise
                chemin_tmp = f"{tmp_dir}/{nom_fichier}"
                with open(chemin_tmp, "wb") as f:
                    f.write(contenu)
                _charger_fichier(nom_state, chemin_tmp, loader, app)
                nb_charges += 1
                print(f"[Artefacts] ✓ {nom_fichier}")

            app.state.model_run_id = run_id
            print(f"[Artefacts] {nb_charges}/{len(_ARTEFACTS)} artefacts chargés depuis GridFS")

        finally:
            if os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir)
                print(f"[Artefacts] /tmp/ nettoyé : {tmp_dir}")

    else:
        # ── MODE SEED ────────────────────────────────────────────────────────
        artefacts_dir = settings.artefacts_dir
        print(f"[Artefacts] Mode seed — {artefacts_dir}")

        for nom_fichier, nom_state, loader in _ARTEFACTS:
            chemin = f"{artefacts_dir}/{nom_fichier}"
            if os.path.exists(chemin):
                _charger_fichier(nom_state, chemin, loader, app)
                print(f"[Artefacts] ✓ {nom_fichier}")
            elif nom_state in _ARTEFACTS_OPTIONNELS:
                setattr(app.state, nom_state, None)
                print(f"[WARNING] Artefact optionnel absent du seed : {nom_fichier} → None")
            else:
                raise FileNotFoundError(
                    f"Artefact obligatoire manquant dans {artefacts_dir} : {nom_fichier}"
                )

        app.state.model_run_id = "seed-initial"
        print(f"[Artefacts] Seed chargé — {len(app.state.nap_features)} features NAP")

    if getattr(app.state, "isotonic_calibrator", None) is None:
        print("[WARNING] Calibration isotonique absente — PD servie BRUTE (gonflée par "
              "scale_pos_weight). Ne jamais présenter cette PD comme fiable en l'état.")


async def charger_feature_metadata(app: FastAPI):
    """
    Charge les 27 feature_metadata depuis MongoDB en mémoire.
    PAS de filtre run_id : les metadata décrivent les features NAP
    qui sont stables entre toutes les versions du modèle.
    """
    db = get_db()
    docs = await db.feature_metadata.find({}, {"_id": 0}).to_list(200)
    app.state.feature_metadata = {doc["feature"]: doc for doc in docs}
    print(f"[Metadata] {len(docs)} documents feature_metadata chargés")


async def charger_seuils(app: FastAPI):
    """
    Charge les seuils PDO configurés par l'admin.

    Au tout premier démarrage (aucun document en base), les valeurs par défaut
    sont sourcées depuis decision_config.json (Jeu 2, BK.1) — score_equiv_accorde/
    score_equiv_refuse — et non plus codées en dur. C'est la même règle de
    décision que le notebook (PD<10% ACCORDÉ / PD>30% REFUSÉ), juste affichée
    en score PDO. Si decision_config.json n'est pas chargé (artefact absent),
    on retombe sur settings.pdo_seuil_accorde/refuse (repli, valeurs identiques
    au Jeu 2 par défaut).

    NB : app.state.seuils_pdo n'est qu'une valeur de secours au démarrage — le
    scoring en production relit toujours admin_config en direct à chaque requête
    (cf. app/routers/scoring.py::_get_seuils_pdo) pour refléter immédiatement un
    changement admin sans redémarrage.
    """
    db = get_db()
    config = await db.admin_config.find_one({"type": "seuils_pdo"})
    if config:
        app.state.seuils_pdo = {
            "accorde": config.get("accorde", settings.pdo_seuil_accorde),
            "refuse":  config.get("refuse",  settings.pdo_seuil_refuse),
        }
    else:
        decision_config = getattr(app.state, "decision_config", None) or {}
        defaut_accorde = decision_config.get("score_equiv_accorde", settings.pdo_seuil_accorde)
        defaut_refuse  = decision_config.get("score_equiv_refuse",  settings.pdo_seuil_refuse)
        app.state.seuils_pdo = {"accorde": defaut_accorde, "refuse": defaut_refuse}
        await db.admin_config.insert_one({
            "type":    "seuils_pdo",
            "accorde": defaut_accorde,
            "refuse":  defaut_refuse,
        })
        print(f"[Seuils] Premier démarrage — seuils PDO initialisés depuis "
              f"{'decision_config.json' if decision_config else 'settings (repli)'} : "
              f"accorde={defaut_accorde}, refuse={defaut_refuse}")


async def charger_flux_b_percentile(app: FastAPI):
    """
    Charge le percentile de seuil Flux B (P95/P99) configuré par l'admin.

    P95 par défaut (coût ~5% de faux positifs, couverture large) — cf. décision
    utilisateur du 05/08/2026. Basculable en P99 via PUT /api/admin/flux-b-percentile
    sans redéploiement, même mécanique que les seuils PDO.
    """
    db = get_db()
    config = await db.admin_config.find_one({"type": "flux_b_percentile"})
    if config:
        app.state.flux_b_percentile = config.get("percentile", settings.flux_b_percentile_defaut)
    else:
        app.state.flux_b_percentile = settings.flux_b_percentile_defaut
        await db.admin_config.insert_one({
            "type":       "flux_b_percentile",
            "percentile": settings.flux_b_percentile_defaut,
        })


# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1.5 — lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Cycle de vie de l'application.

    Démarrage : cherche modèle PRODUCTION dans MongoDB.
      → Trouvé avec GridFS : charge depuis GridFS (run_id réel)
      → Non trouvé          : fallback seed (premier lancement)
    """
    print("=" * 50)
    print("  Scoring Backend — Démarrage")
    print("=" * 50)

    await connect_db()

    modele_prod = await get_db().modeles.find_one({"statut": "PRODUCTION"})
    if modele_prod and modele_prod.get("fichiers_gridfs"):
        run_id_prod = modele_prod["run_id"]
        print(f"[Lifespan] Modèle PRODUCTION trouvé : {run_id_prod}")
        await charger_artefacts(app, run_id=run_id_prod)
    else:
        print("[Lifespan] Aucun modèle GridFS en PRODUCTION — fallback seed")
        await charger_artefacts(app)

    await charger_feature_metadata(app)
    await charger_seuils(app)
    await charger_flux_b_percentile(app)

    print("[OK] Backend prêt")
    yield

    await disconnect_db()
    print("[OK] Backend arrêté proprement")


# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Scoring de Risque de Crédit — API",
    description="Application IA de prédiction du comportement de solvabilité — ENSPY GI2026 / IT Nearshore",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1.6 — Routes (upload_model ajouté)
# ─────────────────────────────────────────────────────────────────────────────
from app.routers import (auth, scoring, clients, decisions,
                         dashboard, monitoring, admin, upload_model)

app.include_router(auth.router)
app.include_router(scoring.router)
app.include_router(clients.router)
app.include_router(decisions.router)
app.include_router(dashboard.router)
app.include_router(monitoring.router)
app.include_router(admin.router)
app.include_router(upload_model.router)


@app.get("/health", tags=["Santé"])
async def health():
    encodage_hybride_charge = (
        getattr(app.state, "encoder_hybrid", None) is not None
        and getattr(app.state, "colonnes_ordonnees_61", None) is not None
    )
    return {
        "statut":                    "ok",
        "model_run_id":              getattr(app.state, "model_run_id", "non-chargé"),
        "features_chargees":         len(getattr(app.state, "nap_features", [])),
        "metadata_chargees":         len(getattr(app.state, "feature_metadata", {})),
        # ── Flux A — calibration BK.1 ────────────────────────────────────────
        "calibration_isotonique_active": getattr(app.state, "isotonic_calibrator", None) is not None,
        "decision_config_charge":        getattr(app.state, "decision_config", None) is not None,
        "seuils_pdo_defaut":             getattr(app.state, "seuils_pdo", None),
        # ── Flux B — garde-fou anomalie, espace hybride 61 dims ──────────────
        "isolation_forest_charge":   getattr(app.state, "isolation_forest", None) is not None,
        "autoencoder_charge":        getattr(app.state, "autoencoder", None) is not None,
        "encodage_hybride_61dims_charge": encodage_hybride_charge,
        "flux_b_actif":              encodage_hybride_charge and (
                                          getattr(app.state, "autoencoder", None) is not None
                                          or getattr(app.state, "isolation_forest", None) is not None
                                      ),
        "flux_b_percentile":         getattr(app.state, "flux_b_percentile", settings.flux_b_percentile_defaut),
        "mock_mode":                 settings.use_mock_artefacts,
    }