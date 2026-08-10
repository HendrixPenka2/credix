"""
Router clients — gestion des profils clients

ENDPOINTS :
  GET  /api/clients/search                         Recherche multi-critères (+ filtres rho)
  GET  /api/clients/{client_id}                    Profil complet
  GET  /api/clients/{client_id}/score-progression  [F2 — NOUVEAU] Évolution du score
  POST /api/clients                                Créer un nouveau client
  PATCH /api/clients/{client_id}                   Modifier profil (champs B uniquement)

CORRECTIONS INTÉGRÉES :
  Session 5 — POST /api/clients : fix OCCUPATION_TYPE mapping (type_emploi)
  Session 9 — GET /search : ajout filtres optionnels rho_min / rho_max / decision_derniere

NOTE SUR LES FILTRES RHO (S2-rework) :
  Le paramètre q (texte) est OPTIONNEL si rho_min ou rho_max est fourni.
  Cela permet d'obtenir la liste des clients thin-file sans terme de recherche.
  Si q, rho_min et rho_max sont tous absents → HTTP 400.
  Les filtres sont cumulatifs : q="Ndongo" + rho_max=0.40 filtre les clients
  nommés "Ndongo" avec une couverture ρc < 0.40.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import uuid
from app.core.security import require_agent
from app.db.collections import col_clients, col_demandes, col_audit_logs, col_decisions

router = APIRouter(prefix="/api/clients", tags=["Clients"])


def _serialize(doc: dict) -> dict:
    """Retire _id MongoDB pour la sérialisation JSON."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/clients/search — enrichi avec filtres rho (S2-rework)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/search")
async def rechercher_clients(
    q: Optional[str] = Query(None, min_length=2, description="Nom, prénom, téléphone ou identifiant"),
    rho_min: Optional[float] = Query(None, ge=0.0, le=1.0, description="Filtre ρc minimum"),
    rho_max: Optional[float] = Query(None, ge=0.0, le=1.0, description="Filtre ρc maximum (ex: 0.40 pour thin-file)"),
    decision_derniere: Optional[str] = Query(None, description="Filtre sur dernière décision: ACCORDE, REFUSE, REVUE_MANUELLE"),
    limit: int = Query(10, le=50),
    current_user: dict = Depends(require_agent)
):
    """
    Recherche multi-critères de clients avec filtres optionnels.

    EXEMPLES D'USAGE :
      /search?q=Mballa                         → recherche textuelle classique
      /search?rho_max=0.40                     → tous les clients thin-file
      /search?q=Ndongo&rho_max=0.40            → client "Ndongo" + thin-file
      /search?rho_min=0.40&rho_max=1.0         → clients avec couverture suffisante
      /search?decision_derniere=REVUE_MANUELLE → clients en attente de revue

    NOTE : q devient optionnel si rho_min ou rho_max est fourni.
    """
    # Validation : au moins un critère requis
    if q is None and rho_min is None and rho_max is None and decision_derniere is None:
        raise HTTPException(
            status_code=400,
            detail="Au moins un critère est requis : q (texte), rho_min, rho_max ou decision_derniere."
        )

    # Construction du filtre MongoDB
    match_conditions = []

    # Filtre texte (optionnel)
    if q:
        match_conditions.append({"$or": [
            {"profile.nom":       {"$regex": q, "$options": "i"}},
            {"profile.prenom":    {"$regex": q, "$options": "i"}},
            {"client_id":         {"$regex": q, "$options": "i"}},
            {"profile.telephone": {"$regex": q, "$options": "i"}},
            # ← NOUVEAU : recherche combinée "prénom nom" (ex: "hatem ben")
            {"$expr": {
                "$regexMatch": {
                    "input": {"$concat": [
                        {"$ifNull": ["$profile.prenom", ""]},
                        " ",
                        {"$ifNull": ["$profile.nom", ""]}
                    ]},
                    "regex": q,
                    "options": "i"
                }
            }}
        ]})

    # Filtres ρc (optionnels, cumulatifs)
    if rho_min is not None:
        match_conditions.append({"coverage.rho": {"$gte": rho_min}})
    if rho_max is not None:
        match_conditions.append({"coverage.rho": {"$lte": rho_max}})

    # Filtre dernière décision (optionnel)
    # Stockée dans le document client après chaque scoring
    if decision_derniere:
        match_conditions.append({"last_score.decision": decision_derniere})

    # Si un seul critère : pas besoin de $and
    filtre = {"$and": match_conditions} if len(match_conditions) > 1 else match_conditions[0]

    pipeline = [
        {"$match": filtre},
        {"$sort": {"coverage.rho": 1}},   # thin-file en premier si filtre rho actif
        {"$limit": limit},
        {"$project": {
            "_id": 0, "client_id": 1,
            "profile.nom": 1, "profile.prenom": 1,
            "profile.type_emploi": 1,
            "coverage.rho": 1,
            "last_score": 1,
            "created_at": 1
        }}
    ]
    results = await col_clients().aggregate(pipeline).to_list(limit)
    return {
        "clients": results,
        "total": len(results),
        "filtres_actifs": {
            "q": q, "rho_min": rho_min, "rho_max": rho_max,
            "decision_derniere": decision_derniere
        }
    }




@router.get("/recently-scored")
async def get_recently_scored(
    limit: int = Query(10, le=50),
    current_user: dict = Depends(require_agent)
):
    """
    Clients triés par date de dernier scoring décroissante.
 
    DIFFÉRENCE AVEC /search?rho_max=1.0 :
      /search trie par coverage.rho CROISSANT (thin-file en premier) — utile
      pour repérer les dossiers à enrichir, mais inadapté pour "derniers
      scorings" : si la base contient beaucoup de clients jamais scorés
      (rho_c = 0), ils remplissent toute la limite avant les vrais clients
      scorés, qui n'apparaissent jamais dans les résultats tronqués.
 
      Cet endpoint filtre d'abord sur last_score != null, PUIS trie par
      last_score.date décroissant — donne exactement les N derniers
      scorings réels, peu importe combien de clients non scorés existent.
    """
    pipeline = [
        {"$match": {"last_score": {"$ne": None}}},
        {"$sort": {"last_score.date": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0, "client_id": 1,
            "profile.nom": 1, "profile.prenom": 1, "profile.type_emploi": 1,
            "coverage.rho": 1, "last_score": 1, "created_at": 1,
        }}
    ]
    results = await col_clients().aggregate(pipeline).to_list(limit)
    return {"clients": results, "total": len(results)}

# ─────────────────────────────────────────────────────────────────────────────
# GET /api/clients/{client_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(require_agent)):
    """Récupère le profil complet d'un client."""
    client = await col_clients().find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' introuvable")
    return client


# ─────────────────────────────────────────────────────────────────────────────
# F2 — GET /api/clients/{client_id}/score-progression
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{client_id}/score-progression")
async def get_score_progression(
    client_id: str,
    current_user: dict = Depends(require_agent)
):
    """
    Évolution du score et de la couverture ρc d'un client au fil du temps.

    DIFFÉRENCE AVEC /api/scoring/history/{client_id} :
      history     → données brutes des demandes (orienté scoring)
      progression → analyse de l'évolution avec deltas et interprétation métier

    CE QUE ÇA RETOURNE :
      historique      → liste chronologique de chaque scoring :
                         date, score_pdo, pd_c, rho_c, décision
      nb_scorings     → nombre de scorings réalisés
      premier_scoring → date + score + rho du premier scoring
      dernier_scoring → date + score + rho du dernier scoring
      delta_score     → score final − score initial (positif = amélioration)
      delta_rho       → rho final − rho initial (positif = dossier enrichi)
      tendance_score  → AMÉLIORATION / DÉGRADATION / STABLE / INSUFFISANT
      tendance_rho    → ENRICHISSEMENT / APPAUVRISSEMENT / STABLE / INSUFFISANT

    CAS D'USAGE PRINCIPAL (thin-file enrichissement) :
      rho_c : 0.22 → 0.18 → 0.65 | Score : 488 → 496 → 581 → ACCORDE
      Le superviseur voit concrètement l'impact de la collecte documentaire.
    """
    # Récupérer toutes les décisions du client, ordre chronologique
    pipeline = [
        {"$match": {"client_id": client_id}},
        {"$sort": {"timestamp": 1}},
        {"$project": {
            "_id": 0,
            "demande_id": 1,
            "timestamp": 1,
            "score_pdo": 1,
            "pd_c": 1,
            "rho_c": 1,
            "decision": "$decision_finale.valeur",
        }}
    ]
    historique = await col_decisions().aggregate(pipeline).to_list(100)

    if not historique:
        return {
            "client_id": client_id,
            "nb_scorings": 0,
            "message": "Aucun scoring enregistré pour ce client.",
            "historique": [],
        }

    nb = len(historique)

    if nb == 1:
        seul = historique[0]
        return {
            "client_id"      : client_id,
            "nb_scorings"    : 1,
            "historique"     : historique,
            "premier_scoring": {"date": seul["timestamp"], "score": seul["score_pdo"], "rho": seul["rho_c"], "decision": seul["decision"]},
            "dernier_scoring": {"date": seul["timestamp"], "score": seul["score_pdo"], "rho": seul["rho_c"], "decision": seul["decision"]},
            "delta_score"    : 0,
            "delta_rho"      : 0.0,
            "tendance_score" : "INSUFFISANT",
            "tendance_rho"   : "INSUFFISANT",
            "message"        : "Un seul scoring disponible — évolution non calculable.",
        }

    premier = historique[0]
    dernier  = historique[-1]

    delta_score = dernier["score_pdo"] - premier["score_pdo"]
    delta_rho   = round(dernier["rho_c"] - premier["rho_c"], 4)

    # Seuils : variation de ±20 points de score = significative
    tendance_score = (
        "AMÉLIORATION" if delta_score > 20  else
        "DÉGRADATION"  if delta_score < -20 else
        "STABLE"
    )
    # Seuils : variation de ±0.10 de rho = significative
    tendance_rho = (
        "ENRICHISSEMENT"  if delta_rho >  0.10 else
        "APPAUVRISSEMENT" if delta_rho < -0.10 else
        "STABLE"
    )

    return {
        "client_id"      : client_id,
        "nb_scorings"    : nb,
        "historique"     : historique,
        "premier_scoring": {
            "date": premier["timestamp"], "score": premier["score_pdo"],
            "rho": premier["rho_c"], "decision": premier["decision"]
        },
        "dernier_scoring": {
            "date": dernier["timestamp"], "score": dernier["score_pdo"],
            "rho": dernier["rho_c"], "decision": dernier["decision"]
        },
        "delta_score"    : delta_score,
        "delta_rho"      : delta_rho,
        "tendance_score" : tendance_score,
        "tendance_rho"   : tendance_rho,
        "resume"         : (
            f"Score : {premier['score_pdo']} → {dernier['score_pdo']} "
            f"({'+'if delta_score>=0 else ''}{delta_score} pts) | "
            f"ρc : {premier['rho_c']:.2f} → {dernier['rho_c']:.2f} | "
            f"Décision : {premier['decision']} → {dernier['decision']}"
        )
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/clients — Créer un nouveau client (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def creer_client(body: dict, current_user: dict = Depends(require_agent)):
    """
    Crée un nouveau client (flux nouveau client ou client non existant).
    Le body contient les données saisies au guichet + champs déclaratifs.

    Champs acceptés dans le body (noms formulaire agent → feature MongoDB) :
      type_emploi / OCCUPATION_TYPE   → features.OCCUPATION_TYPE
      type_revenu / NAME_INCOME_TYPE  → features.NAME_INCOME_TYPE
      niveau_education / NAME_EDUCATION_TYPE → features.NAME_EDUCATION_TYPE
      anciennete_emploi_mois          → features.employment_years (calculé)
      anciennete_domicile_mois        → features.registration_years (calculé)
      date_naissance                  → features.age_years (calculé)
      genre                           → features.CODE_GENDER_bin (calculé)
    """
    client_id = f"CLT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    # Calculer age_years depuis date_naissance si fournie
    age_years = None
    if body.get("date_naissance"):
        try:
            from datetime import date
            dob = datetime.fromisoformat(body["date_naissance"]).date()
            today = date.today()
            age_years = (today - dob).days / 365.25
        except Exception:
            pass

    # Calculer employment_years depuis anciennete_emploi_mois
    employment_years = None
    if body.get("anciennete_emploi_mois"):
        employment_years = float(body["anciennete_emploi_mois"]) / 12.0

    # Calculer registration_years depuis anciennete_domicile_mois
    registration_years = None
    if body.get("anciennete_domicile_mois"):
        registration_years = float(body["anciennete_domicile_mois"]) / 12.0

    # CODE_GENDER_bin depuis genre
    genre = body.get("genre")
    code_gender_bin = 1.0 if genre == "M" else 0.0 if genre == "F" else None

    # Correction BUG Session 5 : accepter les deux noms de champs
    occupation_type = body.get("type_emploi") or body.get("OCCUPATION_TYPE")
    income_type     = body.get("type_revenu") or body.get("NAME_INCOME_TYPE")
    education_type  = body.get("niveau_education") or body.get("NAME_EDUCATION_TYPE")

    document = {
        "client_id": client_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "profile": {
            "nom": body.get("nom"),
            "prenom": body.get("prenom"),
            "date_naissance": body.get("date_naissance"),
            "genre": genre,
            "situation_familiale": body.get("situation_familiale"),
            "nb_enfants": body.get("nb_enfants"),
            "type_emploi": occupation_type,
            "type_revenu": income_type,
            "niveau_education": education_type,
            "telephone": body.get("telephone"),
            "agence_saisie": body.get("agence_saisie"),
        },
        "coverage": {
            "rho": 0.0,
            "sources_disponibles": [],
            "sources_manquantes": [],
            "has_history": False,
        },
        "features": {
            "age_years": age_years,
            "employment_years": employment_years,
            "registration_years": registration_years,
            "CODE_GENDER": genre,
            "CODE_GENDER_bin": code_gender_bin,
            "NAME_INCOME_TYPE": income_type,
            "NAME_EDUCATION_TYPE": education_type,
            "OCCUPATION_TYPE": occupation_type,
            "ORGANIZATION_TYPE": body.get("ORGANIZATION_TYPE"),
            "REGION_RATING_CLIENT": body.get("REGION_RATING_CLIENT"),
            "EMERGENCYSTATE_MODE": body.get("EMERGENCYSTATE_MODE"),
            # Features C : toutes à None → WOE bin "Manquant" → ρc faible (thin-file)
            "EXT_SOURCE_1": None, "EXT_SOURCE_2": None, "EXT_SOURCE_3": None,
            "bureau_active_count": None, "bureau_debt_total": None,
            "avg_payment_ratio": None, "avg_payment_diff": None,
            "std_payment_ratio": None, "inst_ever_late": None,
            "history_length_days": None, "pos_avg_dpd_all": None,
            "prev_refused_ratio": None, "prev_avg_down_payment": None,
        },
        "last_score": None,
        "is_new_client": True,
        "created_by": current_user["sub"],
    }

    try:
        await col_clients().insert_one(document)
    except Exception as e:
        if "duplicate key" in str(e):
            raise HTTPException(status_code=409, detail="Ce client existe déjà")
        raise HTTPException(status_code=500, detail="Erreur lors de la création du client")

    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": current_user["sub"],
        "user_role": current_user.get("role"),
        "action": "CLIENT_CREATE",
        "ressource": "clients",
        "ressource_id": client_id,
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"is_new_client": True}
    })

    return {"client_id": client_id, "message": "Client créé avec succès",
            "is_new_client": True, "has_history": False}


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/clients/{client_id} — Modifier profil (inchangé)
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{client_id}", status_code=200)
async def modifier_profil_client(
    client_id: str,
    body: dict,
    current_user: dict = Depends(require_agent)
):
    """
    Met à jour les champs modifiables du profil client (Scénario 3 — changement de situation).

    CHAMPS ACCEPTÉS (features B modifiables) :
      anciennete_emploi_mois   → recalcule features.employment_years
      anciennete_domicile_mois → recalcule features.registration_years
      OCCUPATION_TYPE          → mise à jour directe + profile.type_emploi
      ORGANIZATION_TYPE        → mise à jour directe (features uniquement)
      NAME_INCOME_TYPE         → mise à jour directe + profile.type_revenu
      NAME_EDUCATION_TYPE      → mise à jour directe + profile.niveau_education
      type_revenu              → alias de NAME_INCOME_TYPE
      niveau_education         → alias de NAME_EDUCATION_TYPE

    CHAMPS REFUSÉS — HTTP 400 (immuables ou features C) :
      date_naissance, genre, CODE_GENDER, CODE_GENDER_bin
      EXT_SOURCE_*, bureau_*, inst_*, pos_*, prev_*
    """
    CHAMPS_IMMUABLES = {"date_naissance", "genre", "CODE_GENDER", "CODE_GENDER_bin", "client_id"}
    FEATURES_C = {
        "EXT_SOURCE_1", "EXT_SOURCE_2", "EXT_SOURCE_3",
        "bureau_active_count", "bureau_debt_total",
        "avg_payment_ratio", "avg_payment_diff", "std_payment_ratio",
        "inst_ever_late", "history_length_days", "pos_avg_dpd_all",
        "prev_refused_ratio", "prev_avg_down_payment",
    }
    champs_interdits = CHAMPS_IMMUABLES | FEATURES_C
    for champ in body.keys():
        if champ in champs_interdits:
            raise HTTPException(
                status_code=400,
                detail=f"Le champ '{champ}' ne peut pas être modifié via ce endpoint."
            )

    client = await col_clients().find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' introuvable")

    set_fields: dict = {"updated_at": datetime.now(timezone.utc)}
    champs_modifies = []

    if "anciennete_emploi_mois" in body and body["anciennete_emploi_mois"] is not None:
        set_fields["features.employment_years"] = float(body["anciennete_emploi_mois"]) / 12.0
        champs_modifies.append("employment_years")

    if "anciennete_domicile_mois" in body and body["anciennete_domicile_mois"] is not None:
        set_fields["features.registration_years"] = float(body["anciennete_domicile_mois"]) / 12.0
        champs_modifies.append("registration_years")

    if "OCCUPATION_TYPE" in body:
        set_fields["features.OCCUPATION_TYPE"] = body["OCCUPATION_TYPE"]
        set_fields["profile.type_emploi"] = body["OCCUPATION_TYPE"]
        champs_modifies.append("OCCUPATION_TYPE")

    if "ORGANIZATION_TYPE" in body:
        set_fields["features.ORGANIZATION_TYPE"] = body["ORGANIZATION_TYPE"]
        champs_modifies.append("ORGANIZATION_TYPE")

    income_val = body.get("NAME_INCOME_TYPE") or body.get("type_revenu")
    if income_val is not None:
        set_fields["features.NAME_INCOME_TYPE"] = income_val
        set_fields["profile.type_revenu"] = income_val
        champs_modifies.append("NAME_INCOME_TYPE")

    edu_val = body.get("NAME_EDUCATION_TYPE") or body.get("niveau_education")
    if edu_val is not None:
        set_fields["features.NAME_EDUCATION_TYPE"] = edu_val
        set_fields["profile.niveau_education"] = edu_val
        champs_modifies.append("NAME_EDUCATION_TYPE")

    if not champs_modifies:
        raise HTTPException(status_code=400, detail="Aucun champ modifiable fourni.")

    await col_clients().update_one({"client_id": client_id}, {"$set": set_fields})

    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": current_user["sub"],
        "user_role": current_user.get("role"),
        "action": "PROFIL_UPDATE",
        "ressource": "clients",
        "ressource_id": client_id,
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"champs_modifies": champs_modifies}
    })

    return {"client_id": client_id, "message": "Profil mis à jour avec succès",
            "champs_modifies": champs_modifies}