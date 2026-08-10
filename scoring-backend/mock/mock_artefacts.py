"""
Artefacts factices pour développer sans les vrais fichiers ML.
USE_MOCK_ARTEFACTS=true dans .env pour activer.
"""
import pandas as pd
import numpy as np


class MockModel:
    """Simule un modèle LightGBM — retourne une proba aléatoire stable."""
    def predict_proba(self, X):
        np.random.seed(42)
        pd_c = np.random.uniform(0.02, 0.25, size=len(X))
        return np.column_stack([1 - pd_c, pd_c])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] > 0.5).astype(int)


class MockWOETransformer:
    """Simule un transformateur WOE — retourne 0.0 pour tout."""
    def transform(self, X):
        return X.fillna(0.0)


def get_mock_artefacts() -> dict:
    FEATURES = [
        "loan_to_income_ratio", "debt_to_income", "annuity_to_credit",
        "goods_to_credit", "age_years", "employment_years",
        "EXT_SOURCE_2", "EXT_SOURCE_3",
        "pos_taux_retard_3m", "pos_dpd_moyen_3m",
        "inst_pct_late", "inst_ever_late",
        "bureau_nb_credits", "bureau_active_count",
        "prev_refused_ratio", "has_history",
        "CODE_GENDER_bin", "FLAG_OWN_CAR_bin", "FLAG_OWN_REALTY_bin",
        "REGION_RATING_CLIENT",
        "NAME_INCOME_TYPE", "NAME_EDUCATION_TYPE",
        "NAME_FAMILY_STATUS", "NAME_HOUSING_TYPE",
        "ORGANIZATION_TYPE", "NAME_CONTRACT_TYPE", "WEEKDAY_APPR_PROCESS_START"
    ]

    iv_data = pd.DataFrame({
        "feature": FEATURES,
        "iv": [0.31, 0.18, 0.12, 0.09, 0.15, 0.14, 0.54, 0.48,
               0.08, 0.07, 0.11, 0.06, 0.09, 0.05,
               0.07, 0.04, 0.03, 0.03, 0.04, 0.05,
               0.06, 0.07, 0.05, 0.04, 0.06, 0.04, 0.03]
    })

    woe = {f: MockWOETransformer() for f in FEATURES}

    return {
        "woe_transformers": woe,
        "nap_features": FEATURES,
        "lgbm_model": MockModel(),
        "iv_scores": iv_data,
        "feature_stats": {f: {"type": "numeric", "iv": 0.1, "p25": 0.5, "p50": 1.0, "p75": 2.0, "p95": 3.5, "nan_rate": 0.1, "direction": "positive", "famille": "F8", "is_declarative": f in ["loan_to_income_ratio", "debt_to_income"], "champs_source": [], "formule": None} for f in FEATURES},
    }
