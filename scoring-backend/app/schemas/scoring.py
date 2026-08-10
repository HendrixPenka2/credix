from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class SHAPItem(BaseModel):
    feature: str
    libelle_agent: str
    shap_value: float
    direction: str
    valeur_brute: Optional[Any] = None
    explication_naturelle: str


class RecommandationRho(BaseModel):
    afficher: bool
    niveau_urgence: Optional[str] = None
    message: Optional[str] = None
    documents_recommandes: Optional[List[Dict]] = None
    rho_potentiel_max: Optional[str] = None


class PercentileData(BaseModel):
    percentile: Optional[int] = None
    score_client: Optional[int] = None
    nb_dossiers_reference: Optional[int] = None
    message: Optional[str] = None
    qualification: Optional[str] = None


class ScoringInput(BaseModel):
    client_id: str
    declaratif: Dict[str, Any] = Field(..., description="Valeurs saisies par l'agent (data-driven)")


class ScoringOutput(BaseModel):
    demande_id: str
    client_id: str
    pd_c: float
    score_pdo: int
    decision: str
    rho_c: float
    shap_top5: List[SHAPItem]
    recommandation_rho: RecommandationRho
    percentile: PercentileData
    model_version: str
    timestamp: str


class SimulationInput(BaseModel):
    client_id: str
    declaratif: Dict[str, Any]


class SimulationOutput(BaseModel):
    pd_c: float
    score_pdo: int
    decision: str
    rho_c: float
    shap_top3: List[SHAPItem]
    is_simulation: bool = True


class FormChamp(BaseModel):
    nom: str
    label: str
    type: str = "number"
    obligatoire: bool = True
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[str]] = None


class FormSchema(BaseModel):
    champs: List[FormChamp]
    run_id: str
    nb_features_modele: int
