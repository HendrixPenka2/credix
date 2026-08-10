"""
HomeCreditAdapter — lit les 7 CSV Home Credit et calcule les features.
Utilisé par seed_database.py pour peupler MongoDB une seule fois.
NE PAS utiliser en temps réel (lecture CSV = lent).

RÈGLE : stocker UNIQUEMENT les 27 features sélectionnées par NAP.
        Aucune feature superflue dans client.features MongoDB.
        Source de vérité : nap_features.pkl (27 features exactes).

27 FEATURES NAP ET LEUR SOURCE :
  Depuis application_test.csv (direct / formule) :
    CODE_GENDER, CODE_GENDER_bin, EMERGENCYSTATE_MODE
    EXT_SOURCE_1, EXT_SOURCE_2, EXT_SOURCE_3
    NAME_CONTRACT_TYPE, NAME_EDUCATION_TYPE, NAME_INCOME_TYPE
    OCCUPATION_TYPE, ORGANIZATION_TYPE, REGION_RATING_CLIENT
    age_years, annuity_to_credit, employment_years
    goods_to_credit, registration_years

  Depuis bureau.csv :
    bureau_active_count, bureau_debt_total

  Depuis installments_payments.csv :
    avg_payment_diff, avg_payment_ratio, history_length_days
    inst_ever_late, std_payment_ratio

  Depuis POS_CASH_balance.csv :
    pos_avg_dpd_all

  Depuis previous_application.csv :
    prev_avg_down_payment, prev_refused_ratio
"""
import os
import numpy as np
import pandas as pd
import random
from typing import Dict, Any, List
from adapters.base_adapter import BaseDataAdapter

# ── Noms fictifs Cameroun + Tunisie ───────────────────────────
PRENOMS_M = ["Thierry", "Rodrigue", "Patrick", "Serge", "Cyrille", "Fabrice", "Achille", "Lionel",
             "Mehdi", "Amine", "Yassine", "Sami", "Zied", "Anis", "Tarek", "Hatem"]
PRENOMS_F = ["Christelle", "Bernadette", "Laure", "Nadège", "Ornella", "Sandrine", "Audrey", "Vanessa",
             "Amira", "Nour", "Ines", "Rim", "Sana", "Fatma", "Leila", "Yasmine"]
NOMS = ["Nguesso", "Mballa", "Fotso", "Kamga", "Tagne", "Njoya", "Mbassi", "Ebong",
        "Ben Salem", "Trabelsi", "Gharbi", "Mansouri", "Chaabane", "Jlassi", "Hamdi", "Abidi"]


def _generate_display_name(sk_id: int) -> tuple:
    """Génère un nom fictif déterministe basé sur SK_ID_CURR."""
    rng = random.Random(sk_id)
    nom = rng.choice(NOMS)
    genre = rng.choice(["M", "F"])
    prenom = rng.choice(PRENOMS_M if genre == "M" else PRENOMS_F)
    return nom, prenom, genre


class HomeCreditAdapter(BaseDataAdapter):

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self._loaded = False
        self._app_test    = None
        self._bureau_agg  = None
        self._pos_agg     = None
        self._inst_agg    = None
        self._prev_agg    = None

    def load_data(self):
        """Charge et pré-agrège les 5 CSV nécessaires aux 27 features NAP."""
        if self._loaded:
            return
        print("[HomeCreditAdapter] Chargement des CSV...")

        # ── application_test.csv ──────────────────────────────
        self._app_test = pd.read_csv(os.path.join(self.data_dir, "application_test.csv"))
        print(f"  application_test.csv  : {len(self._app_test):,} lignes")

        # ── bureau.csv → bureau_active_count, bureau_debt_total ──
        bureau = pd.read_csv(os.path.join(self.data_dir, "bureau.csv"))
        bureau["is_active"] = (bureau["CREDIT_ACTIVE"] == "Active").astype(int)
        self._bureau_agg = bureau.groupby("SK_ID_CURR").agg(
            bureau_active_count=("is_active",             "sum"),
            bureau_debt_total  =("AMT_CREDIT_SUM_DEBT",   "sum"),
        ).reset_index()
        print(f"  bureau.csv            : {len(self._bureau_agg):,} clients agrégés")

        # ── POS_CASH_balance.csv → pos_avg_dpd_all ───────────
        pos = pd.read_csv(os.path.join(self.data_dir, "POS_CASH_balance.csv"))
        self._pos_agg = pos.groupby("SK_ID_CURR").agg(
            pos_avg_dpd_all=("SK_DPD", "mean"),  # DPD moyen sur tout l'historique POS
        ).reset_index()
        print(f"  POS_CASH_balance.csv  : {len(self._pos_agg):,} clients agrégés")

        # ── installments_payments.csv ─────────────────────────
        # → avg_payment_diff, avg_payment_ratio, std_payment_ratio,
        #   inst_ever_late, history_length_days
        inst = pd.read_csv(os.path.join(self.data_dir, "installments_payments.csv"))
        inst["delay_days"]    = inst["DAYS_ENTRY_PAYMENT"] - inst["DAYS_INSTALMENT"]
        inst["is_late_inst"]  = (inst["delay_days"] > 0).astype(int)
        inst["payment_ratio"] = np.where(
            inst["AMT_INSTALMENT"] > 0,
            inst["AMT_PAYMENT"] / inst["AMT_INSTALMENT"],
            np.nan
        )
        inst["payment_diff"]  = inst["AMT_PAYMENT"] - inst["AMT_INSTALMENT"]

        self._inst_agg = inst.groupby("SK_ID_CURR").agg(
            inst_ever_late      =("is_late_inst",   "max"),
            avg_payment_ratio   =("payment_ratio",  "mean"),
            avg_payment_diff    =("payment_diff",   "mean"),
            std_payment_ratio   =("payment_ratio",  "std"),
            history_length_days =("DAYS_INSTALMENT", lambda x: abs(x.min())),
        ).reset_index()
        print(f"  installments.csv      : {len(self._inst_agg):,} clients agrégés")

        # ── previous_application.csv → prev_refused_ratio, prev_avg_down_payment ──
        prev = pd.read_csv(os.path.join(self.data_dir, "previous_application.csv"))
        prev["is_refused"] = (prev["NAME_CONTRACT_STATUS"] == "Refused").astype(int)
        self._prev_agg = prev.groupby("SK_ID_CURR").agg(
            prev_refused_ratio     =("is_refused",        "mean"),
            prev_avg_down_payment  =("AMT_DOWN_PAYMENT",  "mean"),
        ).reset_index()
        print(f"  previous_application  : {len(self._prev_agg):,} clients agrégés")

        self._loaded = True
        print("[HomeCreditAdapter] Chargement terminé")

    def _get_row(self, sk_id: int) -> pd.Series:
        row = self._app_test[self._app_test.SK_ID_CURR == sk_id]
        return row.iloc[0] if len(row) > 0 else None

    def _nan(self, val):
        """Convertit NaN pandas → None et types numpy → types Python natifs."""
        try:
            if pd.isna(val):
                return None
        except (TypeError, ValueError):
            pass
        if isinstance(val, np.integer):  return int(val)
        if isinstance(val, np.floating): return float(val)
        if isinstance(val, np.bool_):    return bool(val)
        return val

    async def get_client_features(self, client_id: str) -> Dict[str, Any]:
        """
        Calcule exactement les 27 features NAP pour un client Home Credit.
        Miroir de Section 2 du notebook Kaggle.
        Aucune feature superflue — uniquement ce que NAP a sélectionné.
        """
        sk_id = int(client_id.replace("HC-", ""))
        row   = self._get_row(sk_id)
        if row is None:
            return {}

        feats = {}

        # ══════════════════════════════════════════════════════
        # BLOC 1 — application_test.csv (17 features)
        # ══════════════════════════════════════════════════════

        # F2 — Identité temporelle (3 features)
        # DAYS_* sont négatifs → abs() / 365.25
        # DAYS_EMPLOYED = 365243 = sentinelle "sans emploi" → NaN
        feats["age_years"]          = abs(row["DAYS_BIRTH"]) / 365.25
        emp = row.get("DAYS_EMPLOYED", 365243)
        feats["employment_years"]   = abs(emp) / 365.25 if emp != 365243 else None
        days_reg = row.get("DAYS_REGISTRATION")
        feats["registration_years"] = abs(days_reg) / 365.25 if days_reg is not None else None

        # F7 — Déclarative binaire (1 feature NAP : CODE_GENDER_bin)
        feats["CODE_GENDER_bin"] = 1.0 if row.get("CODE_GENDER") == "M" else 0.0

        # F8 — Ratios financiers (2 features NAP : annuity_to_credit, goods_to_credit)
        credit  = row.get("AMT_CREDIT", 0)
        annuity = row.get("AMT_ANNUITY", 0)
        goods   = row.get("AMT_GOODS_PRICE", 0)
        feats["annuity_to_credit"] = annuity / credit if credit and credit > 0 else None
        feats["goods_to_credit"]   = goods   / credit if credit and credit > 0 else None

        # F9 — Catégorielles multi-modalités (5 features NAP)
        for col in [
            "NAME_CONTRACT_TYPE",
            "NAME_INCOME_TYPE",
            "NAME_EDUCATION_TYPE",
            "OCCUPATION_TYPE",
            "ORGANIZATION_TYPE",
        ]:
            feats[col] = self._nan(row.get(col))

        # Autres catégorielles NAP individuelles
        feats["CODE_GENDER"]         = self._nan(row.get("CODE_GENDER"))
        feats["EMERGENCYSTATE_MODE"] = self._nan(row.get("EMERGENCYSTATE_MODE"))
        feats["REGION_RATING_CLIENT"]= self._nan(row.get("REGION_RATING_CLIENT"))

        # EXT_SOURCE — Scores bureau externe (3 features NAP)
        feats["EXT_SOURCE_1"] = self._nan(row.get("EXT_SOURCE_1"))
        feats["EXT_SOURCE_2"] = self._nan(row.get("EXT_SOURCE_2"))
        feats["EXT_SOURCE_3"] = self._nan(row.get("EXT_SOURCE_3"))

        # ══════════════════════════════════════════════════════
        # BLOC 2 — bureau.csv (2 features NAP)
        # ══════════════════════════════════════════════════════
        bureau_row = self._bureau_agg[self._bureau_agg.SK_ID_CURR == sk_id]
        if len(bureau_row) > 0:
            b = bureau_row.iloc[0]
            feats["bureau_active_count"] = self._nan(b["bureau_active_count"])
            feats["bureau_debt_total"]   = self._nan(b["bureau_debt_total"])
        else:
            feats["bureau_active_count"] = None
            feats["bureau_debt_total"]   = None

        # ══════════════════════════════════════════════════════
        # BLOC 3 — POS_CASH_balance.csv (1 feature NAP)
        # ══════════════════════════════════════════════════════
        pos_row = self._pos_agg[self._pos_agg.SK_ID_CURR == sk_id]
        feats["pos_avg_dpd_all"] = self._nan(pos_row.iloc[0]["pos_avg_dpd_all"]) \
                                   if len(pos_row) > 0 else None

        # ══════════════════════════════════════════════════════
        # BLOC 4 — installments_payments.csv (5 features NAP)
        # ══════════════════════════════════════════════════════
        inst_row = self._inst_agg[self._inst_agg.SK_ID_CURR == sk_id]
        if len(inst_row) > 0:
            i = inst_row.iloc[0]
            feats["inst_ever_late"]      = self._nan(i["inst_ever_late"])
            feats["avg_payment_ratio"]   = self._nan(i["avg_payment_ratio"])
            feats["avg_payment_diff"]    = self._nan(i["avg_payment_diff"])
            feats["std_payment_ratio"]   = self._nan(i["std_payment_ratio"])
            feats["history_length_days"] = self._nan(i["history_length_days"])
        else:
            feats["inst_ever_late"]      = None
            feats["avg_payment_ratio"]   = None
            feats["avg_payment_diff"]    = None
            feats["std_payment_ratio"]   = None
            feats["history_length_days"] = 0  # 0 = pas d'historique (pas NaN)

        # ══════════════════════════════════════════════════════
        # BLOC 5 — previous_application.csv (2 features NAP)
        # ══════════════════════════════════════════════════════
        prev_row = self._prev_agg[self._prev_agg.SK_ID_CURR == sk_id]
        if len(prev_row) > 0:
            pv = prev_row.iloc[0]
            feats["prev_refused_ratio"]    = self._nan(pv["prev_refused_ratio"])
            feats["prev_avg_down_payment"] = self._nan(pv["prev_avg_down_payment"])
        else:
            feats["prev_refused_ratio"]    = None
            feats["prev_avg_down_payment"] = None

        # Vérification finale : exactement 27 features
        assert len(feats) == 27, f"Attendu 27 features, obtenu {len(feats)}: {list(feats.keys())}"

        return feats

    async def get_client_profile(self, client_id: str) -> Dict[str, Any]:
        """Retourne le profil civil avec noms fictifs camerounais/tunisiens."""
        sk_id = int(client_id.replace("HC-", ""))
        row   = self._get_row(sk_id)
        nom, prenom, genre = _generate_display_name(sk_id)

        if row is None:
            return {"nom": nom, "prenom": prenom, "genre": genre}

        days_birth = int(row.get("DAYS_BIRTH", 0))
        from datetime import date, timedelta
        dob = date.today() - timedelta(days=abs(days_birth))

        return {
            "nom"                  : nom,
            "prenom"               : prenom,
            "genre"                : genre,
            "date_naissance"       : dob.isoformat(),
            "situation_familiale"  : self._nan(row.get("NAME_FAMILY_STATUS")),
            "nb_enfants"           : self._nan(row.get("CNT_CHILDREN")),
            "nb_membres_foyer"     : self._nan(row.get("CNT_FAM_MEMBERS")),
            "niveau_education"     : self._nan(row.get("NAME_EDUCATION_TYPE")),
            "type_emploi"          : self._nan(row.get("OCCUPATION_TYPE")),
            "type_revenu"          : self._nan(row.get("NAME_INCOME_TYPE")),
            "region_rating"        : self._nan(row.get("REGION_RATING_CLIENT")),
            "possession_vehicule"  : row.get("FLAG_OWN_CAR")    == "Y",
            "propriete_immobiliere": row.get("FLAG_OWN_REALTY")  == "Y",
        }

    async def list_all_client_ids(self) -> List[str]:
        """Retourne tous les client_ids Home Credit (format HC-{SK_ID_CURR})."""
        return [f"HC-{sk}" for sk in self._app_test["SK_ID_CURR"].tolist()]