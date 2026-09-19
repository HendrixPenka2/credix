from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Artefacts
    use_mock_artefacts: bool = False
    artefacts_dir: str = "./artefacts"
    home_credit_data_dir: str = ""

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "scoring_db"

    # JWT
    jwt_secret: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 8

    # LLM
    llm_provider: str = "gemini"
    google_api_key: str = ""
    anthropic_api_key: str = ""

    # PDF Worker
    pdf_worker_url: str = "http://pdf-worker:8001"

    # Seuils PDO (repli — normalement sourcés depuis decision_config.json au 1er
    # démarrage, cf. app/main.py::charger_seuils). Valeurs = Jeu 2 (BK.1) :
    # PD<10% -> ACCORDÉ, PD>30% -> REFUSÉ, équivalent score via Score=515.06-28.85*ln(PD/(1-PD))
    pdo_seuil_accorde: float = 578.5
    pdo_seuil_refuse: float = 539.5

    # Flux B — percentile de seuil d'anomalie par défaut (P95 ou P99).
    # Repli si admin_config["flux_b_percentile"] absent (1er démarrage).
    flux_b_percentile_defaut: int = 95

    # PSI
    psi_seuil_attention: float = 0.10
    psi_seuil_derive: float = 0.25

    # rho_c
    rho_seuil_banniere: float = 0.42
    rho_seuil_revue_forcee: float = 0.25

    # MLflow
    mlflow_tracking_uri: str = "http://mlflow:5000"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
