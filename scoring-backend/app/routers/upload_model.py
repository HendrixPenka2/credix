"""
Router : upload des artefacts ML vers GridFS.

MODIFIÉ (refonte 61 dims / BK.1 — août 2026) :
  - 11 → 14 artefacts : ajout isotonic_calibrator.pkl + decision_config.json
    (BK.1, calibration + décision Jeu 2) et colonnes_ordonnees_61.json
    (ordre des colonnes de l'encodage hybride Flux B)
  - encoder_if.pkl (Frequency 27 dims) retiré, remplacé par encoder_hybrid.pkl
    (One-Hot + Unknown + Frequency, 61 dims — partagé AE + IF)
  - autoencoder_credix.keras renommé autoencoder.keras (nouvelle architecture
    61→22→8→22→61)
  - CHAMPS_FICHIERS mis à jour, endpoint upload-model étendu

Rôle : permettre à l'admin d'uploader les 14 artefacts du pipeline
CREDIX via HTTP (multipart/form-data), sans avoir besoin d'un accès
SSH ou Docker au serveur. Les fichiers sont stockés dans GridFS sous
un run_id UUID4 généré par le backend. Le modèle est enregistré en
statut STAGING dans col_modeles — il ne sera actif qu'après promotion
via POST /api/monitoring/promote-model.
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.security import require_admin
from app.db.collections import col_modeles
from app.db.gridfs import sauvegarder_artefact

router = APIRouter(prefix="/api/admin", tags=["Admin — Upload modèle"])

# ── Mapping : champ multipart → nom du fichier dans GridFS ──────────────────
CHAMPS_FICHIERS: dict[str, str] = {
    # ── Flux A (5) : pipeline scoring supervisé ─────────────────────────────
    "woe_transformers": "woe_transformers.pkl",
    "nap_features":     "nap_features.pkl",
    "lgbm_model":       "lgbm_final.pkl",
    "iv_scores":        "iv_scores_final.csv",
    "feature_stats":    "feature_stats.json",
    # ── Flux A — BK.1 (2) : calibration isotonique + config de décision ─────
    "isotonic_calibrator": "isotonic_calibrator.pkl",
    "decision_config":     "decision_config.json",
    # ── Flux B — IF (4) : Isolation Forest (repli, espace hybride 61 dims) ──
    "isolation_forest": "isolation_forest.pkl",
    "scaler_if":        "scaler_if.pkl",
    "encoder_hybrid":   "encoder_hybrid.pkl",
    "if_metadata":      "if_metadata.json",
    # ── Flux B — AE (2) : Autoencodeur Keras (principal) ────────────────────
    "autoencoder":      "autoencoder.keras",
    "ae_metadata":      "ae_metadata.json",
    # ── Flux B — encodage (1) : ordre des 61 colonnes ────────────────────────
    "colonnes_ordonnees_61": "colonnes_ordonnees_61.json",
}


@router.post("/upload-model", summary="Uploader les 14 artefacts ML (ADMIN)")
async def upload_model(
    # ── Flux A — 5 fichiers obligatoires ────────────────────────────────────
    woe_transformers: UploadFile = File(...),
    nap_features:     UploadFile = File(...),
    lgbm_model:       UploadFile = File(...),
    iv_scores:        UploadFile = File(...),
    feature_stats:    UploadFile = File(...),
    # ── Flux A — BK.1 — 2 fichiers obligatoires ─────────────────────────────
    isotonic_calibrator: UploadFile = File(...),
    decision_config:      UploadFile = File(...),
    # ── Flux B IF — 4 fichiers obligatoires ─────────────────────────────────
    isolation_forest: UploadFile = File(...),
    scaler_if:        UploadFile = File(...),
    encoder_hybrid:   UploadFile = File(...),
    if_metadata:      UploadFile = File(...),
    # ── Flux B AE — 2 fichiers obligatoires ─────────────────────────────────
    autoencoder:      UploadFile = File(...),
    ae_metadata:      UploadFile = File(...),
    # ── Flux B encodage — 1 fichier obligatoire ─────────────────────────────
    colonnes_ordonnees_61: UploadFile = File(...),
    # ── Champs texte ────────────────────────────────────────────────────────
    nom_version: str = Form(...),
    description: str = Form(...),
    metriques:   str = Form(default="{}"),
    # ── Sécurité ────────────────────────────────────────────────────────────
    current_user: dict = Depends(require_admin),
):
    """
    Upload des 14 artefacts ML vers GridFS.

    Flux A (5) : woe_transformers, nap_features, lgbm_model, iv_scores, feature_stats
    Flux A — BK.1 (2) : isotonic_calibrator, decision_config
    Flux B IF (4) : isolation_forest, scaler_if, encoder_hybrid, if_metadata
    Flux B AE (2) : autoencoder (Keras), ae_metadata
    Flux B encodage (1) : colonnes_ordonnees_61

    - Génère un run_id UUID4 côté backend
    - Stocke chaque fichier dans GridFS bucket "artefacts_ml"
    - Enregistre la version en statut STAGING dans col_modeles
    - Retourne { run_id, statut, fichiers_recus, message }

    La version doit ensuite être promue via POST /api/monitoring/promote-model.
    """

    # ── Regrouper les UploadFile ─────────────────────────────────────────────
    fichiers_recus: dict[str, UploadFile] = {
        "woe_transformers":      woe_transformers,
        "nap_features":          nap_features,
        "lgbm_model":            lgbm_model,
        "iv_scores":             iv_scores,
        "feature_stats":         feature_stats,
        "isotonic_calibrator":   isotonic_calibrator,
        "decision_config":       decision_config,
        "isolation_forest":      isolation_forest,
        "scaler_if":             scaler_if,
        "encoder_hybrid":        encoder_hybrid,
        "if_metadata":           if_metadata,
        "autoencoder":           autoencoder,
        "ae_metadata":           ae_metadata,
        "colonnes_ordonnees_61": colonnes_ordonnees_61,
    }

    # ── Vérifier que tous les fichiers sont présents ─────────────────────────
    manquants = [
        champ for champ, f in fichiers_recus.items()
        if f is None or f.filename == ""
    ]
    if manquants:
        raise HTTPException(
            status_code=422,
            detail=f"Fichiers manquants ou vides : {', '.join(manquants)}"
        )

    # ── Générer le run_id ────────────────────────────────────────────────────
    run_id = str(uuid.uuid4())

    # ── Sauvegarder dans GridFS ──────────────────────────────────────────────
    noms_gridfs = []
    for champ, upload_file in fichiers_recus.items():
        nom_gridfs = CHAMPS_FICHIERS[champ]
        contenu = await upload_file.read()
        await sauvegarder_artefact(run_id, nom_gridfs, contenu)
        noms_gridfs.append(nom_gridfs)
        print(f"[Upload] ✓ {nom_gridfs} ({len(contenu):,} bytes)")

    # ── Parser les métriques ─────────────────────────────────────────────────
    try:
        metriques_dict = json.loads(metriques)
        if not isinstance(metriques_dict, dict):
            metriques_dict = {}
    except (json.JSONDecodeError, ValueError):
        metriques_dict = {}

    # ── Insérer dans col_modeles ─────────────────────────────────────────────
    await col_modeles().insert_one({
        "run_id":          run_id,
        "nom_version":     nom_version,
        "description":     description,
        "statut":          "STAGING",
        "date_upload":     datetime.now(timezone.utc),
        "uploaded_by":     current_user["sub"],
        "metriques":       metriques_dict,
        "fichiers_gridfs": noms_gridfs,
    })

    return {
        "run_id":         run_id,
        "statut":         "STAGING",
        "nb_artefacts":   len(noms_gridfs),
        "fichiers_recus": noms_gridfs,
        "message": (
            f"14 artefacts uploadés avec succès (Flux A + calibration BK.1 + "
            f"Flux B hybride 61 dims). Version '{nom_version}' en STAGING. "
            f"Utilisez POST /api/monitoring/promote-model "
            f"avec run_id='{run_id}' pour l'activer."
        )
    }