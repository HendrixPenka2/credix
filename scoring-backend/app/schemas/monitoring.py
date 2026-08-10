from pydantic import BaseModel
from typing import Optional


class PSIResponse(BaseModel):
    psi: Optional[float]
    statut: str
    couleur: str
    message: str
    nb_scores_reference: int
    nb_scores_actuels: int


class ModelVersionResponse(BaseModel):
    run_id: str
    version: str
    statut: str
    metriques: Optional[dict]
    date_entrainement: Optional[str]
    promoted_at: Optional[str]
