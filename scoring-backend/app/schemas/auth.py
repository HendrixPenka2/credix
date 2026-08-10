from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    role: str
    user_id: str
    nom: str
    prenom: str
    expires_at: str
