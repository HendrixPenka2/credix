from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
from app.core.security import verify_password, create_token, get_current_user, hash_password
from app.db.collections import col_utilisateurs, col_audit_logs
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentification"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    user = await col_utilisateurs().find_one({"username": body.username})
    ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(body.password, user["password_hash"]):
        await col_audit_logs().insert_one({
            "timestamp": datetime.now(timezone.utc),
            "user_id": body.username,
            "user_role": "INCONNU",
            "action": "AUTH_LOGIN_FAIL",
            "ressource": "utilisateurs",
            "ressource_id": body.username,
            "ip_address": ip,
            "statut": "ECHEC",
            "details": {"raison": "Identifiants incorrects"}
        })
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if not user.get("actif", True):
        raise HTTPException(status_code=403, detail="Compte désactivé. Contactez votre administrateur.")

    token_data = create_token(user["user_id"], user["role"])

    await col_utilisateurs().update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "token.jwt_token": token_data["token"],
            "token.expires_at": token_data["expires_at"],
            "statistiques.derniere_connexion": datetime.now(timezone.utc)
        }}
    )

    await col_audit_logs().insert_one({
        "timestamp": datetime.now(timezone.utc),
        "user_id": user["user_id"],
        "user_role": user["role"],
        "action": "AUTH_LOGIN",
        "ressource": "utilisateurs",
        "ressource_id": user["user_id"],
        "ip_address": ip,
        "statut": "SUCCES",
        "details": {}
    })

    return {
        "token": token_data["token"],
        "role": user["role"],
        "user_id": user["user_id"],
        "nom": user.get("profil", {}).get("nom", ""),
        "prenom": user.get("profil", {}).get("prenom", ""),
        "expires_at": token_data["expires_at"]
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    await col_utilisateurs().update_one(
        {"user_id": current_user["sub"]},
        {"$set": {"token.jwt_token": None}}
    )
    return {"message": "Déconnexion réussie"}
