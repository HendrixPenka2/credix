import uuid
from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional
from app.core.security import require_admin, hash_password
from app.core.config import settings                          # ← ajout pour fallback PDO
from app.db.collections import col_utilisateurs, col_audit_logs, col_admin_config

router = APIRouter(prefix="/api/admin", tags=["Administration"])


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    role: str = Field(..., pattern="^(AGENT|SUPERVISEUR|ADMIN)$")
    nom: str
    prenom: str
    email: str
    agence: Optional[str] = None


class ThresholdsRequest(BaseModel):
    accorde: float = Field(..., ge=300, le=850)
    refuse: float = Field(..., ge=300, le=850)


# ── Utilisateurs ──────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(current_user: dict = Depends(require_admin)):
    """Liste tous les utilisateurs."""
    users = await col_utilisateurs().find(
        {},
        {"_id": 0, "password_hash": 0, "token": 0}
    ).to_list(100)
    return {"users": users, "total": len(users)}


@router.post("/users", status_code=201)
async def create_user(body: CreateUserRequest, current_user: dict = Depends(require_admin)):
    """Crée un nouveau compte utilisateur."""
    existing = await col_utilisateurs().find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail=f"L'utilisateur '{body.username}' existe déjà")

    user_id = str(uuid.uuid4())
    doc = {
        "user_id": user_id,
        "username": body.username,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "actif": True,
        "profil": {
            "nom": body.nom,
            "prenom": body.prenom,
            "email": body.email,
            "agence": body.agence,
        },
        "token": {"jwt_token": None, "expires_at": None},
        "statistiques": {
            "nb_demandes_soumises": 0,
            "nb_decisions_accordees": 0,
            "nb_decisions_refusees": 0,
            "nb_decisions_revue": 0,
            "nb_overrides_superviseur": 0,
            "derniere_connexion": None,
        },
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user["sub"],
    }
    await col_utilisateurs().insert_one(doc)
    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": current_user["sub"],
        "user_role": "ADMIN",
        "action": "USER_CREATE",
        "ressource": "utilisateurs",
        "ressource_id": user_id,
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"username": body.username, "role": body.role}
    })
    return {"user_id": user_id, "username": body.username, "role": body.role}


@router.put("/users/{user_id}/toggle")
async def toggle_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Active ou désactive un compte (jamais supprimé)."""
    user = await col_utilisateurs().find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    new_status = not user.get("actif", True)
    await col_utilisateurs().update_one(
        {"user_id": user_id},
        {"$set": {"actif": new_status}}
    )
    return {"user_id": user_id, "actif": new_status}


# ── Seuils PDO ────────────────────────────────────────────────────────────────

@router.get("/thresholds")
async def get_thresholds(current_user: dict = Depends(require_admin)):
    """
    Lit les seuils PDO actuellement configurés.

    Retourne les valeurs stockées dans admin_config (si elles existent)
    ou les valeurs par défaut définies dans config.py (600/500).

    Utilisé par le frontend pour pré-remplir le formulaire de configuration
    avant toute modification via PUT /thresholds.
    """
    config = await col_admin_config().find_one({"type": "seuils_pdo"}, {"_id": 0})
    if config:
        return {
            "accorde": config.get("accorde", settings.pdo_seuil_accorde),
            "refuse": config.get("refuse", settings.pdo_seuil_refuse),
        }
    # Premier démarrage — aucune config en base → retourner les defaults
    return {
        "accorde": settings.pdo_seuil_accorde,   # 600.0
        "refuse": settings.pdo_seuil_refuse,      # 500.0
    }

@router.put("/seuil-alerte-pd")
async def update_seuil_alerte_pd(
    seuil: float = Query(..., ge=0.05, le=0.80,
                         description="Seuil PD (entre 5% et 80%) — ex: 0.20 pour 20%"),
    current_user: dict = Depends(require_admin)
):
    """
    Configure le seuil d'alerte PD pour la vue portefeuille superviseur.
    Valeur par défaut : 0.20 (20%).
    Plage autorisée : 0.05 → 0.80.
    Exemple : PUT /api/admin/seuil-alerte-pd?seuil=0.15
    """
    await col_admin_config().update_one(
        {"type": "seuil_alerte_pd"},
        {"$set": {
            "seuil": seuil,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user["sub"],
        }},
        upsert=True,
    )
    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": current_user["sub"],
        "user_role": current_user.get("role"),
        "action": "SEUIL_ALERTE_PD_UPDATE",
        "ressource": "admin_config",
        "ressource_id": "seuil_alerte_pd",
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"nouveau_seuil": seuil},
    })
    return {"message": "Seuil mis à jour", "seuil_alerte_pd": seuil}


@router.put("/thresholds")
async def update_thresholds(body: ThresholdsRequest, current_user: dict = Depends(require_admin)):
    """
    Met à jour les seuils PDO de décision (ACCORDÉ / REFUSÉ).

    Ces seuils opèrent sur le score PDO calculé à partir de la PD CALIBRÉE
    (isotonic, BK.1) — ils restent en score (300-850) côté API/admin par choix
    (plus lisible métier), mathématiquement équivalents au Jeu 2 raisonné en PD
    par le notebook (PD<10%/>30% ⇔ score≈578,5/≈539,5 avec les offset/factor
    actuels). Toute valeur PD-équivalente reste calculable via pd_to_score().
    """
    if body.refuse >= body.accorde:
        raise HTTPException(
            status_code=400,
            detail="Le seuil REFUSÉ doit être strictement inférieur au seuil ACCORDÉ"
        )

    await col_admin_config().update_one(
        {"type": "seuils_pdo"},
        {"$set": {
            "accorde": body.accorde,
            "refuse": body.refuse,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user["sub"],
        }},
        upsert=True,
    )
    return {"message": "Seuils mis à jour", "accorde": body.accorde, "refuse": body.refuse}


# ── Seuil Flux B (percentile d'anomalie P95/P99) ────────────────────────────

class FluxBPercentileRequest(BaseModel):
    percentile: int = Field(..., description="95 ou 99 — percentile du seuil d'anomalie AE/IF")

    @property
    def valide(self) -> bool:
        return self.percentile in (95, 99)


@router.get("/flux-b-percentile")
async def get_flux_b_percentile(current_user: dict = Depends(require_admin)):
    """
    Lit le percentile de seuil Flux B actuellement configuré (95 ou 99).

    P95 (~5% de faux positifs, couverture large) ou P99 (~1% de faux positifs,
    plus strict) — arbitrage opérationnel qui dépend de la capacité de revue du
    service (cf. RAPPORT_FLUXB_61DIMS.md §13/§27.6). Défaut P95.
    """
    config = await col_admin_config().find_one({"type": "flux_b_percentile"}, {"_id": 0})
    return {"percentile": config.get("percentile", settings.flux_b_percentile_defaut) if config
            else settings.flux_b_percentile_defaut}


@router.put("/flux-b-percentile")
async def update_flux_b_percentile(
    body: FluxBPercentileRequest, current_user: dict = Depends(require_admin)
):
    """Configure le percentile de seuil d'anomalie du Flux B (AE/IF) — 95 ou 99 uniquement."""
    if not body.valide:
        raise HTTPException(status_code=400, detail="Le percentile doit être 95 ou 99")

    await col_admin_config().update_one(
        {"type": "flux_b_percentile"},
        {"$set": {
            "percentile": body.percentile,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user["sub"],
        }},
        upsert=True,
    )
    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": current_user["sub"],
        "user_role": current_user.get("role"),
        "action": "FLUX_B_PERCENTILE_UPDATE",
        "ressource": "admin_config",
        "ressource_id": "flux_b_percentile",
        "ip_address": "internal",
        "statut": "SUCCES",
        "details": {"nouveau_percentile": body.percentile},
    })
    return {"message": "Percentile Flux B mis à jour", "percentile": body.percentile}