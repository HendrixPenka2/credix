"""
GenericAdapter — adapter piloté par fichier YAML.

PRINCIPE DE COEXISTENCE :
  Ce fichier ne modifie AUCUN fichier existant.
  HomeCreditAdapter reste intact et fonctionnel en parallèle.
  Les deux adapters peuvent coexister indéfiniment.

USAGE :
  adapter = GenericAdapter(
      config_path="configs/adapter_config_home_credit.yaml",
      data_dir=os.getenv("HOME_CREDIT_DATA_DIR", "")
  )
  adapter.load_data()
  features = await adapter.get_client_features("HC-100001")

PREUVE D'ÉQUIVALENCE :
  python tests/test_adapter_equivalence.py
  → Vérifie que GenericAdapter == HomeCreditAdapter sur les 27 features.

TYPES D'OPÉRATIONS SUPPORTÉES (couvrent les 27 features NAP) :
  Table primaire :
    direct               — lecture directe d'une colonne
    abs_divide           — abs(col) / diviseur
    abs_divide_sentinel  — abs(col) / diviseur, mais None si col == sentinel
    binary_encode        — 1.0 si col == valeur_vraie, sinon 0.0
    safe_ratio           — num / den, None si den <= 0 ou NaN

  Tables secondaires (agrégées par join_key) :
    agg_sum              — sum(col)
    agg_mean             — mean(col)
    agg_count_where      — sum((col == valeur).astype(int))
    agg_mean_flag        — mean((col == valeur).astype(int))
    agg_max_flag         — max((col_a - col_b > seuil).astype(int))
    agg_mean_safe_ratio  — mean(num/den où den > 0, NaN sinon)
    agg_std_safe_ratio   — std(num/den où den > 0, NaN sinon)
    agg_mean_diff        — mean(col_a - col_b)
    agg_abs_min          — abs(min(col))
"""
import os
import random
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import yaml

from adapters.base_adapter import BaseDataAdapter


# ── Noms fictifs identiques à HomeCreditAdapter (déterministe par sk_id) ──
# Dupliqués ici pour que les deux fichiers soient totalement indépendants.
PRENOMS_M = [
    "Thierry", "Rodrigue", "Patrick", "Serge", "Cyrille", "Fabrice",
    "Achille", "Lionel", "Mehdi", "Amine", "Yassine", "Sami",
    "Zied", "Anis", "Tarek", "Hatem",
]
PRENOMS_F = [
    "Christelle", "Bernadette", "Laure", "Nadège", "Ornella",
    "Sandrine", "Audrey", "Vanessa", "Amira", "Nour", "Ines",
    "Rim", "Sana", "Fatma", "Leila", "Yasmine",
]
NOMS = [
    "Nguesso", "Mballa", "Fotso", "Kamga", "Tagne", "Njoya", "Mbassi",
    "Ebong", "Ben Salem", "Trabelsi", "Gharbi", "Mansouri", "Chaabane",
    "Jlassi", "Hamdi", "Abidi",
]


def _generate_display_name(sk_id: int) -> tuple:
    """Génère un nom fictif déterministe basé sur SK_ID_CURR.
    Identique à HomeCreditAdapter._generate_display_name().
    """
    rng = random.Random(sk_id)
    nom = rng.choice(NOMS)
    genre = rng.choice(["M", "F"])
    prenom = rng.choice(PRENOMS_M if genre == "M" else PRENOMS_F)
    return nom, prenom, genre


class GenericAdapter(BaseDataAdapter):
    """
    Adapter générique piloté par fichier YAML.

    Implémente exactement l'interface BaseDataAdapter.
    Produit des valeurs identiques à HomeCreditAdapter pour les 27 features NAP.
    Extensible : changer d'institution = fournir un nouveau fichier YAML.
    """

    def __init__(self, config_path: str, data_dir: str):
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        self.data_dir = data_dir
        self.join_key: str = self.config["adapter"]["join_key"]
        self.client_prefix: str = self.config["adapter"]["client_id_prefix"]
        self.primary_source: str = self.config["adapter"]["primary_table"]

        self._loaded: bool = False
        self._primary_df: Optional[pd.DataFrame] = None
        self._aggregated: Dict[str, pd.DataFrame] = {}

    # ══════════════════════════════════════════════════════════════════════════
    # CHARGEMENT (sync — appeler avant tout get_client_*)
    # ══════════════════════════════════════════════════════════════════════════

    def load_data(self) -> None:
        """
        Charge et pré-agrège tous les CSV définis dans le YAML.
        Idempotent : un second appel est ignoré.
        Doit être appelé avant get_client_features().
        """
        if self._loaded:
            return

        print("[GenericAdapter] Chargement des CSV...")
        sources = self.config["sources"]

        # ── Table primaire ────────────────────────────────────────────────
        path = os.path.join(self.data_dir, sources[self.primary_source])
        self._primary_df = pd.read_csv(path)
        print(f"  {sources[self.primary_source]}: {len(self._primary_df):,} lignes")

        # ── Tables secondaires → pré-agrégées ────────────────────────────
        for src_name, filename in sources.items():
            if src_name == self.primary_source:
                continue
            self._aggregated[src_name] = self._preaggregate_source(src_name, filename)

        self._loaded = True
        print("[GenericAdapter] Chargement terminé")

    def _preaggregate_source(self, src_name: str, filename: str) -> pd.DataFrame:
        """
        Lit un CSV secondaire, calcule les colonnes dérivées nécessaires,
        et agrège par join_key.

        Chaque feature du YAML de type agg_* contribue à l'agrégation.
        Les colonnes dérivées partagées entre features (même paramètres)
        ne sont créées qu'une seule fois.
        """
        path = os.path.join(self.data_dir, filename)
        df = pd.read_csv(path)
        print(f"  {filename}: {len(df):,} lignes → agrégation...")

        # Collecter les features de ce source nécessitant une agrégation
        features_src = {
            name: spec
            for name, spec in self.config["features"].items()
            if spec["source"] == src_name and spec["type"].startswith("agg_")
        }

        if not features_src:
            return df

        agg_dict: Dict[str, tuple] = {}

        for feat_name, spec in features_src.items():
            t = spec["type"]

            if t == "agg_sum":
                agg_dict[feat_name] = (spec["column"], "sum")

            elif t == "agg_mean":
                agg_dict[feat_name] = (spec["column"], "mean")

            elif t == "agg_count_where":
                # Colonne flag partageable si même condition
                flag_col = f"_flag_{spec['condition_column']}_{spec['condition_equals']}"
                if flag_col not in df.columns:
                    df[flag_col] = (
                        df[spec["condition_column"]] == spec["condition_equals"]
                    ).astype(int)
                agg_dict[feat_name] = (flag_col, "sum")

            elif t == "agg_mean_flag":
                flag_col = f"_flag_{spec['condition_column']}_{spec['condition_equals']}"
                if flag_col not in df.columns:
                    df[flag_col] = (
                        df[spec["condition_column"]] == spec["condition_equals"]
                    ).astype(int)
                agg_dict[feat_name] = (flag_col, "mean")

            elif t == "agg_max_flag":
                # Différence de deux colonnes, puis flag si > seuil
                diff_key = f"_diff_{spec['col_a']}_{spec['col_b']}"
                if diff_key not in df.columns:
                    df[diff_key] = df[spec["col_a"]] - df[spec["col_b"]]
                flag_key = f"_flaggt_{diff_key}"
                if flag_key not in df.columns:
                    df[flag_key] = (df[diff_key] > spec["threshold"]).astype(int)
                agg_dict[feat_name] = (flag_key, "max")

            elif t in ("agg_mean_safe_ratio", "agg_std_safe_ratio"):
                # Ratio sécurisé — clé partagée si même paire num/den
                # (avg_payment_ratio et std_payment_ratio utilisent la même colonne)
                ratio_key = f"_ratio_{spec['numerator']}_{spec['denominator']}"
                if ratio_key not in df.columns:
                    df[ratio_key] = np.where(
                        df[spec["denominator"]] > 0,
                        df[spec["numerator"]] / df[spec["denominator"]],
                        np.nan,
                    )
                agg_op = "mean" if t == "agg_mean_safe_ratio" else "std"
                agg_dict[feat_name] = (ratio_key, agg_op)

            elif t == "agg_mean_diff":
                diff_key = f"_diff_{spec['col_a']}_{spec['col_b']}"
                if diff_key not in df.columns:
                    df[diff_key] = df[spec["col_a"]] - df[spec["col_b"]]
                agg_dict[feat_name] = (diff_key, "mean")

            elif t == "agg_abs_min":
                # abs(min(col)) — pour history_length_days
                # Le minimum est négatif (jours passés), abs() le rend positif
                agg_dict[feat_name] = (
                    spec["column"],
                    lambda x: abs(x.min()),
                )

        if not agg_dict:
            return df

        result = df.groupby(self.join_key).agg(**agg_dict).reset_index()
        print(f"    → {len(result):,} clients agrégés")
        return result

    # ══════════════════════════════════════════════════════════════════════════
    # INTERFACE BaseDataAdapter
    # ══════════════════════════════════════════════════════════════════════════

    async def list_all_client_ids(self) -> List[str]:
        self.load_data()
        ids = self._primary_df[self.join_key].tolist()
        return [f"{self.client_prefix}{int(i)}" for i in ids]

    async def get_client_features(self, client_id: str) -> Dict[str, Any]:
        """
        Retourne exactement les 27 features NAP pour un client.
        Les valeurs sont identiques à HomeCreditAdapter (prouvé par test d'équivalence).
        """
        self.load_data()
        sk_id = self._parse_id(client_id)

        rows = self._primary_df[self._primary_df[self.join_key] == sk_id]
        if len(rows) == 0:
            return {}
        row = rows.iloc[0]

        feats: Dict[str, Any] = {}
        for feat_name, spec in self.config["features"].items():
            feats[feat_name] = self._compute(sk_id, row, feat_name, spec)

        assert len(feats) == 27, (
            f"Attendu 27 features, obtenu {len(feats)}: {list(feats.keys())}"
        )
        return feats

    async def get_client_profile(self, client_id: str) -> Dict[str, Any]:
        """
        Retourne le profil civil avec noms fictifs déterministes.
        Identique à HomeCreditAdapter.get_client_profile().
        """
        self.load_data()
        sk_id = self._parse_id(client_id)
        rows = self._primary_df[self._primary_df[self.join_key] == sk_id]

        nom, prenom, genre = _generate_display_name(sk_id)
        if len(rows) == 0:
            return {"nom": nom, "prenom": prenom, "genre": genre}

        row = rows.iloc[0]
        days_birth = int(row.get("DAYS_BIRTH", 0))
        dob = date.today() - timedelta(days=abs(days_birth))

        return {
            "nom"                   : nom,
            "prenom"                : prenom,
            "genre"                 : genre,
            "date_naissance"        : dob.isoformat(),
            "situation_familiale"   : self._nan(row.get("NAME_FAMILY_STATUS")),
            "nb_enfants"            : self._nan(row.get("CNT_CHILDREN")),
            "nb_membres_foyer"      : self._nan(row.get("CNT_FAM_MEMBERS")),
            "niveau_education"      : self._nan(row.get("NAME_EDUCATION_TYPE")),
            "type_emploi"           : self._nan(row.get("OCCUPATION_TYPE")),
            "type_revenu"           : self._nan(row.get("NAME_INCOME_TYPE")),
            "region_rating"         : self._nan(row.get("REGION_RATING_CLIENT")),
            "possession_vehicule"   : row.get("FLAG_OWN_CAR")   == "Y",
            "propriete_immobiliere" : row.get("FLAG_OWN_REALTY") == "Y",
        }

    # ══════════════════════════════════════════════════════════════════════════
    # CALCUL DES FEATURES
    # ══════════════════════════════════════════════════════════════════════════

    def _compute(
        self,
        sk_id: int,
        primary_row: pd.Series,
        feat_name: str,
        spec: dict,
    ) -> Any:
        """Dispatcher : choisit primary vs aggregated selon la source."""
        if spec["source"] == self.primary_source:
            return self._compute_primary(primary_row, spec)
        return self._compute_aggregated(sk_id, feat_name, spec)

    def _compute_primary(self, row: pd.Series, spec: dict) -> Any:
        """
        Handlers pour les features calculées depuis la table primaire.
        Reproduit EXACTEMENT la logique de HomeCreditAdapter.get_client_features().
        """
        t = spec["type"]

        if t == "direct":
            # Miroir de : self._nan(row.get("EXT_SOURCE_2"))
            return self._nan(row.get(spec["column"]))

        elif t == "abs_divide":
            # Miroir de : abs(row["DAYS_BIRTH"]) / 365.25
            # et : abs(days_reg) / 365.25 if days_reg is not None else None
            val = row.get(spec["column"])
            if val is None:
                return None
            return abs(val) / spec["divisor"]  # NaN se propage si val est NaN

        elif t == "abs_divide_sentinel":
            # Miroir de : abs(emp) / 365.25 if emp != 365243 else None
            # La valeur sentinelle (365243) signifie "sans emploi"
            sentinel = spec["sentinel_value"]
            val = row.get(spec["column"], sentinel)
            if val is None or val == sentinel:
                return None
            return abs(val) / spec["divisor"]

        elif t == "binary_encode":
            # Miroir de : 1.0 if row.get("CODE_GENDER") == "M" else 0.0
            return 1.0 if row.get(spec["column"]) == spec["true_value"] else 0.0

        elif t == "safe_ratio":
            # Miroir de : annuity / credit if credit and credit > 0 else None
            num = row.get(spec["numerator"], 0)
            den = row.get(spec["denominator"], 0)
            # Gère : 0 (falsy), None, NaN (truthy mais den > 0 est False pour NaN)
            if not den or not (den > 0):
                return None
            return num / den

        return None

    def _compute_aggregated(self, sk_id: int, feat_name: str, spec: dict) -> Any:
        """Lookup dans la table pré-agrégée pour un client donné."""
        src = spec["source"]
        agg_df = self._aggregated.get(src)
        if agg_df is None:
            return None

        rows = agg_df[agg_df[self.join_key] == sk_id]
        if len(rows) == 0:
            # Valeur par défaut si le client est absent de cette table
            # Ex : history_length_days = 0 quand pas d'historique (pas None)
            return spec.get("default_if_missing", None)

        return self._nan(rows.iloc[0][feat_name])

    # ══════════════════════════════════════════════════════════════════════════
    # UTILITAIRES
    # ══════════════════════════════════════════════════════════════════════════

    def _parse_id(self, client_id: str) -> int:
        """Extrait l'entier SK_ID depuis 'HC-100001' → 100001."""
        return int(client_id.replace(self.client_prefix, ""))

    @staticmethod
    def _nan(val: Any) -> Any:
        """
        Convertit NaN pandas → None et types numpy → types Python natifs.
        Identique à HomeCreditAdapter._nan().
        """
        try:
            if pd.isna(val):
                return None
        except (TypeError, ValueError):
            pass
        if isinstance(val, np.integer):  return int(val)
        if isinstance(val, np.floating): return float(val)
        if isinstance(val, np.bool_):    return bool(val)
        return val