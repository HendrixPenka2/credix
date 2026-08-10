"""
Router décisions — revue manuelle, override superviseur, export PDF

ENDPOINTS :
  GET  /api/decisions/override-stats   [F1 — NOUVEAU] Statistiques superviseur
  GET  /api/decisions/pending-review              File des revues en attente
  POST /api/decisions/{demande_id}/override       Trancher une revue manuelle
  GET  /api/decisions/{demande_id}/pdf            Export PDF d'une décision
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from app.core.security import require_agent, require_superviseur
from app.db.collections import col_decisions, col_clients, col_audit_logs
from app.services.pdf_client import generer_pdf

router = APIRouter(prefix="/api/decisions", tags=["Décisions"])


# ─────────────────────────────────────────────────────────────────────────────
# F1 — GET /api/decisions/override-stats
# DOIT ÊTRE DÉCLARÉ AVANT /{demande_id}/... pour éviter que FastAPI
# interprète "override-stats" comme un paramètre de chemin.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/override-stats")
async def get_override_stats(current_user: dict = Depends(require_superviseur)):
    """
    Statistiques sur les interventions superviseur (overrides).

    MÉTRIQUES RETOURNÉES :
      total_revue           → nombre total de dossiers passés en REVUE_MANUELLE
      total_overrides       → combien ont effectivement été tranchés par le superviseur
      overrides_accordes    → parmi les tranchés : combien accordés
      overrides_refuses     → parmi les tranchés : combien refusés
      taux_override_pct     → % des revues tranchées (= engagement superviseur)
      taux_accord_pct       → % d'accords parmi les overrides (= tendance superviseur)
      taux_desaccord_modele → % des revues où le superviseur a dit ACCORDE
                              (le modèle avait hésité → REVUE, superviseur dit oui)

    VALEUR MÉMOIRE :
      Montre que les seuils PDO sont bien calibrés : si le superviseur accorde
      80% des revues, les seuils sont trop conservateurs.
      Si le superviseur refuse 90% → les seuils sont trop laxistes.
    """
    pipeline = [
        {"$facet": {

            # Branche 1 : total dossiers passés par la zone REVUE
            "total_revue": [
                {"$match": {"decision_initiale.valeur": "REVUE_MANUELLE"}},
                {"$count": "n"}
            ],

            # Branche 2 : total interventions superviseur
            "total_overrides": [
                {"$match": {"override_superviseur": True}},
                {"$count": "n"}
            ],

            # Branche 3 : distribution des décisions superviseur
            "distribution_overrides": [
                {"$match": {"override_superviseur": True}},
                {"$group": {
                    "_id": "$decision_finale.valeur",
                    "count": {"$sum": 1}
                }}
            ],

            # Branche 4 : revues où le superviseur a accordé
            #  = modèle hésitait (REVUE), superviseur dit OUI
            "accords_depuis_revue": [
                {"$match": {
                    "override_superviseur": True,
                    "decision_initiale.valeur": "REVUE_MANUELLE",
                    "decision_finale.valeur": "ACCORDE"
                }},
                {"$count": "n"}
            ]
        }}
    ]

    result = await col_decisions().aggregate(pipeline).to_list(1)
    if not result:
        return _empty_override_stats()

    data = result[0]

    total_revue    = data["total_revue"][0]["n"]    if data["total_revue"]    else 0
    total_overrides = data["total_overrides"][0]["n"] if data["total_overrides"] else 0
    accords_depuis_revue = data["accords_depuis_revue"][0]["n"] if data["accords_depuis_revue"] else 0

    # Construire la distribution des overrides
    distribution = {d["_id"]: d["count"] for d in data.get("distribution_overrides", [])}
    overrides_accordes = distribution.get("ACCORDE", 0)
    overrides_refuses  = distribution.get("REFUSE",  0)

    # Taux calculés
    taux_override_pct     = round(total_overrides / total_revue * 100, 1) if total_revue > 0 else 0.0
    taux_accord_pct       = round(overrides_accordes / total_overrides * 100, 1) if total_overrides > 0 else 0.0
    taux_desaccord_modele = round(accords_depuis_revue / total_overrides * 100, 1) if total_overrides > 0 else 0.0

    return {
        "total_revue"           : total_revue,
        "total_overrides"       : total_overrides,
        "overrides_accordes"    : overrides_accordes,
        "overrides_refuses"     : overrides_refuses,
        "taux_override_pct"     : taux_override_pct,
        "taux_accord_pct"       : taux_accord_pct,
        "taux_desaccord_modele" : taux_desaccord_modele,
        "interpretation": (
            "Seuils bien calibrés"          if 30 <= taux_accord_pct <= 70 else
            "Seuils trop conservateurs"     if taux_accord_pct > 70 else
            "Seuils trop laxistes"
        )
    }


def _empty_override_stats() -> dict:
    """Retourné si la collection decisions est vide."""
    return {
        "total_revue": 0, "total_overrides": 0,
        "overrides_accordes": 0, "overrides_refuses": 0,
        "taux_override_pct": 0.0, "taux_accord_pct": 0.0,
        "taux_desaccord_modele": 0.0,
        "interpretation": "Aucune donnée disponible"
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS EXISTANTS (inchangés)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pending-review")
async def get_pending_reviews(current_user: dict = Depends(require_superviseur)):
    """File des dossiers en attente de revue manuelle (superviseur)."""
    pipeline = [
        {"$match": {"decision_finale.valeur": "REVUE_MANUELLE", "override_superviseur": False}},
        {"$sort": {"timestamp": 1}},
        {"$limit": 50},
        {"$lookup": {
            "from": "clients", "localField": "client_id",
            "foreignField": "client_id", "as": "client"
        }},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "demandes", "localField": "demande_id",
            "foreignField": "demande_id", "as": "demande"
        }},
        {"$unwind": {"path": "$demande", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0, "demande_id": 1, "client_id": 1, "timestamp": 1,
            "score_pdo": 1, "pd_c": 1, "rho_c": 1,
            "shap_top5": 1, "recommandation_rho": 1,
            "anomaly_score": 1, "is_anomaly": 1, "if_escalade": 1,
            "client_nom": "$client.profile.nom",
            "client_prenom": "$client.profile.prenom",
            "client_profile": "$client.profile",
            "client_features": "$client.features",
            "declaratif": "$demande.input.declaratif",
        }}
    ]
    dossiers = await col_decisions().aggregate(pipeline).to_list(50)
    return {"dossiers": dossiers, "total": len(dossiers)}


class OverrideRequest(BaseModel):
    decision: str = Field(..., pattern="^(ACCORDE|REFUSE)$")
    commentaire: str = Field(..., min_length=20)


@router.get("/my-decisions")
async def get_my_decisions(
    periode: str = Query("30j", pattern="^(7j|30j|90j|all)$"),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_agent)
):
    """
    Liste des décisions produites par l'agent connecté.
 
    DONNÉES : collection decisions, filtrées sur agent_id == current_user.
      Nécessite le champ agent_id (voir patch scoring.py — 01_scoring_py_PATCH.py).
      Les décisions créées avant ce patch n'apparaîtront pas ici.
 
    RETOURNE : liste triée par date décroissante, avec nom/prénom client
      enrichis via $lookup sur la collection clients.
    """
    filtre: dict = {"agent_id": current_user["sub"]}
    if periode != "all":
        jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
        depuis = datetime.now(timezone.utc) - timedelta(days=jours)
        filtre["timestamp"] = {"$gte": depuis}
 
    pipeline = [
        {"$match": filtre},
        {"$sort": {"timestamp": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "clients", "localField": "client_id",
            "foreignField": "client_id", "as": "client"
        }},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0, "demande_id": 1, "client_id": 1, "timestamp": 1,
            "score_pdo": 1, "pd_c": 1, "rho_c": 1,
            "decision_finale": 1, "is_anomaly": 1, "if_escalade": 1,
            "client_nom": "$client.profile.nom",
            "client_prenom": "$client.profile.prenom",
        }}
    ]
    decisions = await col_decisions().aggregate(pipeline).to_list(limit)
    return {"decisions": decisions, "total": len(decisions), "periode": periode}



@router.get("/my-overrides")
async def get_my_overrides(
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_superviseur)
):
    """
    Liste des dossiers que CE superviseur a personnellement tranchés.
 
    DONNÉES : collection decisions, filtrées sur superviseur_id == current_user
    ET override_superviseur == True (les champs sont posés par /override).
    Triées par override_at décroissant (le plus récent en premier).
    """
    pipeline = [
        {"$match": {
            "superviseur_id": current_user["sub"],
            "override_superviseur": True,
        }},
        {"$sort": {"override_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "clients", "localField": "client_id",
            "foreignField": "client_id", "as": "client"
        }},
        {"$unwind": {"path": "$client", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0, "demande_id": 1, "client_id": 1,
            "score_pdo": 1, "decision_finale": 1,
            "commentaire_superviseur": 1, "override_at": 1,
            "client_nom": "$client.profile.nom",
            "client_prenom": "$client.profile.prenom",
        }}
    ]
    overrides = await col_decisions().aggregate(pipeline).to_list(limit)
    return {"overrides": overrides, "total": len(overrides)}


@router.post("/{demande_id}/override")
async def override_decision(
    demande_id: str,
    body: OverrideRequest,
    current_user: dict = Depends(require_superviseur)
):
    """Validation ou rejet d'une revue manuelle par le superviseur."""
    decision_doc = await col_decisions().find_one({"demande_id": demande_id})
    if not decision_doc:
        raise HTTPException(status_code=404, detail="Décision introuvable")

    if decision_doc.get("override_superviseur", False):
        raise HTTPException(status_code=409, detail="Cette décision a déjà été tranchée")

    # Correction BUG-A1 : seule une décision REVUE_MANUELLE peut être tranchée
    if decision_doc.get("decision_finale", {}).get("valeur") != "REVUE_MANUELLE":
        raise HTTPException(
            status_code=400,
            detail="Seule une décision en REVUE_MANUELLE peut être tranchée par un superviseur."
        )

    now = datetime.now(timezone.utc)
    await col_decisions().update_one(
        {"demande_id": demande_id},
        {"$set": {
            "decision_finale.valeur": body.decision,
            "override_superviseur": True,
            "commentaire_superviseur": body.commentaire,
            "superviseur_id": current_user["sub"],
            "override_at": now,
        }}
    )

    await col_audit_logs().insert_one({
        "timestamp": now,
        "user_id": current_user["sub"],
        "user_role": current_user.get("role"),
        "action": "DECISION_OVERRIDE",
        "ressource": "decisions",
        "ressource_id": demande_id,
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"decision": body.decision, "commentaire": body.commentaire}
    })

    return {"message": "Décision enregistrée", "decision": body.decision, "demande_id": demande_id}


@router.get("/{demande_id}/pdf")
async def export_pdf(demande_id: str, current_user: dict = Depends(require_agent)):
    """Génère et retourne le rapport PDF d'une décision."""
    decision = await col_decisions().find_one({"demande_id": demande_id}, {"_id": 0})
    if not decision:
        raise HTTPException(status_code=404, detail="Décision introuvable")

    client = await col_clients().find_one({"client_id": decision["client_id"]}, {"_id": 0})

    payload = {
        "demande_id": demande_id,
        "decision": decision,
        "client": client or {},
        "agent_id": current_user["sub"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    pdf_bytes = await generer_pdf(payload)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rapport_{demande_id}.pdf"'}
    )