"""
Router monitoring — PSI drift, versions modèles, promotion, audit, feature drift

ENDPOINTS :
  GET  /api/monitoring/model-drift          PSI dérive du score global (existant)
  GET  /api/monitoring/model-versions       Liste des versions (existant)
  POST /api/monitoring/promote-model        Promotion STAGING → PRODUCTION (modifié étape 1.4)
  GET  /api/monitoring/audit-logs           Journal d'audit (ADMIN)
  GET  /api/monitoring/feature-drift        PSI par variable NAP

MODIFICATION ÉTAPE 1.4 :
  promote_model() : charger_artefacts(request.app)
                 → charger_artefacts(request.app, run_id=body.run_id)
  Corrige le Problème 1 : le promote recharge maintenant les VRAIS fichiers
  GridFS du run_id promu, pas toujours le seed ./artefacts/.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from app.core.security import require_superviseur, require_admin
from app.db.collections import col_decisions, col_modeles, col_audit_logs, col_demandes
from app.services.psi_service import calculer_psi, calculer_psi_generique, interpreter_psi

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring"])


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT EXISTANT — model-drift (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/model-drift")
async def get_model_drift(current_user: dict = Depends(require_superviseur)):
    """
    Calcule le PSI de dérive du modèle (score global).

    PRINCIPE PSI :
      Compare la distribution des SCORES PDO entre :
        - Période de référence : 30 premiers jours après la promotion du modèle
        - Période actuelle    : 30 derniers jours

      Si la forme de la distribution a significativement changé → le modèle
      voit une population différente de celle pour laquelle il a été entraîné.

    INTERPRÉTATION :
      PSI < 0.10 → STABLE    → rien à faire
      PSI < 0.25 → ATTENTION → surveiller, investiguer
      PSI ≥ 0.25 → DÉRIVE    → réentraînement recommandé

    STATUT INSUFFISANT (démo) :
      Retourné si moins de 10 scorings dans la période de référence.
      Normal en environnement de démonstration avec peu de données.
    """
    modele_prod = await col_modeles().find_one({"statut": "PRODUCTION"}, {"promoted_at": 1})
    if not modele_prod:
        return {"psi": None, "statut": "INCONNU", "message": "Aucun modèle en production"}

    promoted_at = modele_prod.get("promoted_at", datetime.now(timezone.utc) - timedelta(days=60))
    ref_limit   = promoted_at + timedelta(days=30)
    depuis_30j  = datetime.now(timezone.utc) - timedelta(days=30)

    scores_ref = [
        d["score_pdo"] async for d in
        col_decisions().find({"timestamp": {"$gte": promoted_at, "$lt": ref_limit}}, {"score_pdo": 1, "_id": 0}).limit(500)
    ]
    scores_act = [
        d["score_pdo"] async for d in
        col_decisions().find({"timestamp": {"$gte": depuis_30j}}, {"score_pdo": 1, "_id": 0}).limit(500)
    ]

    if len(scores_ref) < 10:
        return {
            "psi": None, "statut": "INSUFFISANT",
            "message": "Pas assez de données de référence (minimum 10 scorings requis)",
            "nb_scores_reference": len(scores_ref),
            "nb_scores_actuels": len(scores_act),
        }

    psi = calculer_psi(scores_ref, scores_act)
    return {
        "psi": psi,
        **interpreter_psi(psi),
        "nb_scores_reference": len(scores_ref),
        "nb_scores_actuels": len(scores_act),
        "periode_reference": promoted_at.isoformat(),
        "calcule_le": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT EXISTANT — model-versions (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/model-versions")
async def get_model_versions(current_user: dict = Depends(require_superviseur)):
    """Liste toutes les versions de modèles (PRODUCTION, STAGING, ARCHIVE)."""
    versions = await col_modeles().find({}, {"_id": 0}).sort("date_entrainement", -1).to_list(20)
    return {"versions": versions}


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT MODIFIÉ — promote-model (étape 1.4)
# ─────────────────────────────────────────────────────────────────────────────

class PromoteRequest(BaseModel):
    run_id: str


@router.post("/promote-model")
async def promote_model(
    body: PromoteRequest,
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """
    Promeut un modèle STAGING → PRODUCTION.
    L'ancien modèle PRODUCTION passe en ARCHIVE.
    Recharge les artefacts en mémoire à chaud.

    CORRECTION ÉTAPE 1.4 :
      Avant : charger_artefacts(request.app)
              → chargeait TOUJOURS le seed ./artefacts/ peu importe le run_id
              → versioning fictif

      Après : charger_artefacts(request.app, run_id=body.run_id)
              → télécharge les VRAIS fichiers GridFS du run_id promu
              → versioning réel : le modèle en RAM = le modèle promu
    """
    target = await col_modeles().find_one({"run_id": body.run_id})
    if not target:
        raise HTTPException(status_code=404, detail=f"Modèle '{body.run_id}' introuvable.")

    if target["statut"] not in ("STAGING", "ARCHIVE"):
        raise HTTPException(
            status_code=400,
            detail=f"Seul un modèle STAGING ou ARCHIVE peut être promu. Statut actuel : {target['statut']}"
        )

    now = datetime.now(timezone.utc)

    # Archiver l'ancien modèle PRODUCTION
    await col_modeles().update_many({"statut": "PRODUCTION"}, {"$set": {"statut": "ARCHIVE"}})

    # Promouvoir le nouveau
    await col_modeles().update_one(
        {"run_id": body.run_id},
        {"$set": {
            "statut":      "PRODUCTION",
            "promoted_by": current_user["sub"],
            "promoted_at": now
        }}
    )

    # ── ÉTAPE 1.4 : rechargement avec le vrai run_id ─────────────────────────
    # AVANT : await charger_artefacts(request.app)
    # APRÈS : await charger_artefacts(request.app, run_id=body.run_id)
    # Cette ligne unique corrige le Problème 1 (versioning fictif).
    try:
        from app.main import charger_artefacts
        await charger_artefacts(request.app, run_id=body.run_id)   # ← CORRIGÉ
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Promotion DB effectuée mais rechargement artefacts échoué : {str(e)}. "
                f"Lancez : docker compose restart api"
            )
        )

    # Log d'audit
    await col_audit_logs().insert_one({
        "timestamp":    now,
        "user_id":      current_user["sub"],
        "user_role":    "ADMIN",
        "action":       "MODEL_PROMOTE",
        "ressource":    "modeles",
        "ressource_id": body.run_id,
        "ip_address":   "internal",
        "statut":       "SUCCES",
        "details":      {"run_id_nouveau": body.run_id}
    })

    return {
        "message":     "Modèle promu en PRODUCTION avec succès",
        "run_id":      body.run_id,
        "promoted_at": now.isoformat()
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/monitoring/audit-logs (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(
    action: Optional[str] = Query(
        None,
        description=(
            "Filtrer par type d'action. Valeurs possibles : "
            "SCORING_REQUEST, PROFIL_UPDATE, CLIENT_CREATE, "
            "DECISION_OVERRIDE, MODEL_PROMOTE, LOGIN, LOGOUT"
        )
    ),
    user_id: Optional[str] = Query(None, description="Filtrer par identifiant utilisateur"),
    limite: int = Query(50, le=200, description="Nombre maximum d'entrées retournées"),
    current_user: dict = Depends(require_admin)
):
    """
    Journal d'audit — toutes les actions traçables du système.

    CONFORMITÉ BÂLE II :
      Chaque action dans CREDIX génère une entrée immuable dans audit_logs :
      scoring, modification de profil, création client, override superviseur,
      promotion de modèle, connexion/déconnexion.
    """
    filtre: dict = {}
    if action:
        filtre["action"] = action
    if user_id:
        filtre["user_id"] = user_id

    logs = await col_audit_logs().find(
        filtre, {"_id": 0}
    ).sort("timestamp", -1).limit(limite).to_list(limite)

    actions_disponibles = [
        "SCORING_REQUEST", "PROFIL_UPDATE", "CLIENT_CREATE",
        "DECISION_OVERRIDE", "MODEL_PROMOTE", "LOGIN", "LOGOUT"
    ]

    return {
        "total":              len(logs),
        "limite":             limite,
        "filtre_action":      action,
        "filtre_user_id":     user_id,
        "logs":               logs,
        "actions_disponibles": actions_disponibles,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/monitoring/feature-drift (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/feature-drift")
async def get_feature_drift(
    request: Request,
    current_user: dict = Depends(require_superviseur)
):
    """
    PSI de dérive par variable NAP (Characteristic Stability Analysis).

    DIFFÉRENCE AVEC /model-drift :
      model-drift    → PSI sur les SCORES PDO (une seule valeur globale)
      feature-drift  → PSI sur chacune des 27 variables WOE individuellement
    """
    nap_features: list = getattr(request.app.state, "nap_features", [])
    if not nap_features:
        return {
            "statut": "ERREUR",
            "message": "Features NAP non chargées. Vérifiez que l'API est correctement démarrée.",
        }

    modele_prod = await col_modeles().find_one({"statut": "PRODUCTION"}, {"promoted_at": 1})
    if not modele_prod:
        return {"statut": "INCONNU", "message": "Aucun modèle en production"}

    promoted_at = modele_prod.get("promoted_at", datetime.now(timezone.utc) - timedelta(days=60))
    ref_limit  = promoted_at + timedelta(days=30)
    depuis_30j = datetime.now(timezone.utc) - timedelta(days=30)

    demandes_ref = await col_demandes().find(
        {"timestamp": {"$gte": promoted_at, "$lt": ref_limit}},
        {"input.features_woe": 1, "_id": 0}
    ).limit(500).to_list(500)

    demandes_act = await col_demandes().find(
        {"timestamp": {"$gte": depuis_30j}},
        {"input.features_woe": 1, "_id": 0}
    ).limit(500).to_list(500)

    if len(demandes_ref) < 10:
        return {
            "statut": "INSUFFISANT",
            "message": (
                f"Pas assez de données de référence ({len(demandes_ref)} demandes). "
                f"Minimum requis : 10."
            ),
            "nb_demandes_reference": len(demandes_ref),
            "nb_demandes_actuelles": len(demandes_act),
        }

    woe_ref: dict = {feat: [] for feat in nap_features}
    woe_act: dict = {feat: [] for feat in nap_features}

    for doc in demandes_ref:
        vw = doc.get("input", {}).get("features_woe", {})
        for feat in nap_features:
            val = vw.get(feat)
            if val is not None:
                woe_ref[feat].append(float(val))

    for doc in demandes_act:
        vw = doc.get("input", {}).get("features_woe", {})
        for feat in nap_features:
            val = vw.get(feat)
            if val is not None:
                woe_act[feat].append(float(val))

    resultats = []
    nb_derives = nb_attention = nb_stables = nb_insuff = 0

    for feat in nap_features:
        psi_val = calculer_psi_generique(woe_ref[feat], woe_act[feat])

        if psi_val is None:
            statut_feat = "INSUFFISANT"
            couleur     = "gris"
            nb_insuff  += 1
        else:
            interp      = interpreter_psi(psi_val)
            statut_feat = interp["statut"]
            couleur     = interp["couleur"]
            if statut_feat == "DERIVE":
                nb_derives   += 1
            elif statut_feat == "ATTENTION":
                nb_attention += 1
            else:
                nb_stables   += 1

        resultats.append({
            "feature": feat,
            "psi":     psi_val,
            "statut":  statut_feat,
            "couleur": couleur,
            "nb_ref":  len(woe_ref[feat]),
            "nb_act":  len(woe_act[feat]),
        })

    ordre_statut = {"DERIVE": 0, "ATTENTION": 1, "STABLE": 2, "INSUFFISANT": 3}
    resultats.sort(key=lambda x: (ordre_statut.get(x["statut"], 4), -(x["psi"] or 0)))

    statut_global = (
        "DERIVE"      if nb_derives   > 0 else
        "ATTENTION"   if nb_attention > 0 else
        "STABLE"      if nb_stables   > 0 else
        "INSUFFISANT"
    )

    return {
        "statut_global":          statut_global,
        "nb_features_analysees":  len(nap_features),
        "nb_derives":             nb_derives,
        "nb_attention":           nb_attention,
        "nb_stables":             nb_stables,
        "nb_insuffisant":         nb_insuff,
        "nb_demandes_reference":  len(demandes_ref),
        "nb_demandes_actuelles":  len(demandes_act),
        "periode_reference":      promoted_at.isoformat(),
        "calcule_le":             datetime.now(timezone.utc).isoformat(),
        "features":               resultats,
    }