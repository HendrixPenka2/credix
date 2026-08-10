from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ClientCreateRequest(BaseModel):
    nom: str
    prenom: str
    date_naissance: Optional[str] = None
    genre: Optional[str] = None
    situation_familiale: Optional[str] = None
    nb_enfants: Optional[int] = None
    type_emploi: Optional[str] = None
    type_revenu: Optional[str] = None
    niveau_education: Optional[str] = None
    anciennete_emploi_mois: Optional[float] = None
    revenu_annuel: Optional[float] = None
    telephone: Optional[str] = None
    agence_saisie: Optional[str] = None


class ClientResponse(BaseModel):
    client_id: str
    profile: Dict[str, Any]
    coverage: Dict[str, Any]
    last_score: Optional[Dict] = None
    is_new_client: bool = False
    created_at: Optional[datetime] = None
