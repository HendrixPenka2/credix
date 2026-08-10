from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class OverrideRequest(BaseModel):
    decision: str = Field(..., pattern="^(ACCORDE|REFUSE)$")
    commentaire: str = Field(..., min_length=20)


class DecisionResponse(BaseModel):
    demande_id: str
    client_id: str
    timestamp: Optional[datetime]
    pd_c: float
    score_pdo: int
    decision_initiale: Dict
    decision_finale: Dict
    rho_c: float
    shap_top5: List[Dict]
    override_superviseur: bool
    model_version: str
