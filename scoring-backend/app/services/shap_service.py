"""
Service SHAP — TreeSHAP + génération de phrases structurées

CORRECTION v2 — Abandon des gabarits Gemini pour la génération de phrases.

PROBLÈME DE L'APPROCHE PRÉCÉDENTE :
  Les gabarits gabarit_aggravant / gabarit_attenuant générés par Gemini ont été
  écrits pour le cas TYPIQUE (ex : EXT_SOURCE_2 faible = aggravant). Quand les
  interactions non-linéaires du modèle produisent un SHAP contra-intuitif
  (EXT_SOURCE_2=0.79 → SHAP positif), le gabarit produit une phrase contradictoire :
  "L'indice est excellent (0.79), indiquant un risque d'octroi accru." → impossible.

NOUVELLE APPROCHE — Template structuré toujours cohérent :
  Phrase = libelle_agent + label_seuil + direction_SHAP + poids_relatif(%)
  - libelle_agent : nom lisible (depuis MongoDB, toujours correct)
  - label_seuil   : intervalle de la valeur brute (depuis MongoDB, toujours factuel)
  - direction     : "augmente" / "réduit" (depuis signe SHAP, toujours vrai)
  - poids         : % de l'explication du modèle (depuis |SHAP| relatif)

CORRECTION v3 (Session 5) :
  Suppression du warning SHAP :
    "LightGBM binary classifier with TreeExplainer shap values output has
     changed to a list of ndarray"
  Ce warning apparaît car SHAP ≥ 0.46 retourne une liste [class0, class1]
  pour les classifieurs binaires. Le code gère déjà ce cas correctement
  (if isinstance(shap_values, list): shap_values = shap_values[1]).
  Le warning est supprimé via warnings.filterwarnings pour ne pas polluer les logs.
"""
import warnings
import shap
import numpy as np
import pandas as pd
from typing import Optional


def calculer_shap(model, X_input: pd.DataFrame, top_n: int = 5) -> list:
    """
    Calcule les valeurs SHAP et retourne le Top N triés par |valeur| décroissant.
    top_n=5 pour scoring réel, top_n=3 pour simulation (plus rapide).
    """
    # ── CORRECTION v3 : suppression du warning cosmétique SHAP ───────────────
    # SHAP ≥ 0.46 retourne une liste pour les classifieurs binaires.
    # Le code gère déjà ce cas. Le warning est supprimé pour nettoyer les logs.
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="LightGBM binary classifier with TreeExplainer shap values output"
        )
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_input)
    # ──────────────────────────────────────────────────────────────────────────

    if isinstance(shap_values, list):
        # SHAP retourne [class0_values, class1_values] pour classifieur binaire
        # On prend class1 (probabilité de défaut = TARGET=1)
        shap_values = shap_values[1]

    shap_array = shap_values[0] if shap_values.ndim == 2 else shap_values
    features = X_input.columns.tolist()

    results = []
    for i, feat in enumerate(features):
        results.append({"feature": feat, "shap_value": float(shap_array[i])})

    # Trier par valeur absolue décroissante
    results.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    return results[:top_n]


def generer_phrase_shap(
    feature: str,
    shap_value: float,
    valeur_brute,
    feature_metadata: dict,
    total_shap_abs: float = None,
) -> dict:
    """
    Génère une phrase SHAP contextuelle depuis un template structuré.

    Paramètres :
      feature          : nom technique de la feature (ex : "EXT_SOURCE_2")
      shap_value       : valeur SHAP brute (positive = aggravant, négative = atténuant)
      valeur_brute     : valeur réelle du client AVANT WOE (pour affichage)
      feature_metadata : dict {feature: metadata_doc} chargé depuis MongoDB
      total_shap_abs   : Σ|SHAP| du top N — permet de calculer le poids relatif (%)
                         Calculé avant la boucle dans pipeline_service.py
    """
    meta = feature_metadata.get(feature)
    direction = "aggravant" if shap_value > 0 else "attenuant"
    direction_texte = "augmente" if shap_value > 0 else "réduit"
    abs_shap = abs(shap_value)

    # ── Fallback minimal si feature introuvable dans metadata ─────────────────
    if not meta:
        return {
            "feature": feature,
            "libelle_agent": feature,
            "shap_value": round(shap_value, 4),
            "direction": direction,
            "valeur_brute": valeur_brute,
            "poids_pct": None,
            "explication_naturelle": (
                f"Variable {feature} : ce facteur {direction_texte} "
                f"le risque estimé (contribution : {shap_value:+.3f})."
            ),
        }

    libelle = meta.get("libelle_agent", feature)
    seuils = meta.get("seuils", [])

    # ── 1. Label d'intervalle depuis les seuils ────────────────────────────────
    label = _trouver_label(valeur_brute, seuils, meta)

    # ── 2. Formatage de la valeur brute ────────────────────────────────────────
    if valeur_brute is None:
        valeur_fmt = "N/A"
    elif meta.get("type") == "categorical":
        valeur_fmt = str(valeur_brute)
    else:
        try:
            valeur_fmt = f"{float(valeur_brute):.2f}"
        except (TypeError, ValueError):
            valeur_fmt = str(valeur_brute)

    # ── 3. Intensité depuis la magnitude du SHAP ──────────────────────────────
    if abs_shap > 0.15:
        intensite = "fortement"
    elif abs_shap > 0.08:
        intensite = ""
    else:
        intensite = "légèrement"

    direction_complete = f"{intensite} {direction_texte}".strip()

    # ── 4. Poids relatif (% de l'explication du modèle pour ce scoring) ───────
    poids_pct: Optional[float] = None
    poids_str = ""
    if total_shap_abs and total_shap_abs > 0:
        poids_pct = round(abs_shap / total_shap_abs * 100, 1)
        poids_str = f" — {poids_pct}% de l'explication"

    # ── 5. Construction finale de la phrase ───────────────────────────────────
    if label and label != libelle and valeur_fmt != "N/A":
        phrase = (
            f"{libelle} : {label} ({valeur_fmt}) — "
            f"ce facteur {direction_complete} le risque estimé{poids_str}."
        )
    elif meta.get("type") == "categorical":
        phrase = (
            f"{libelle} : {valeur_fmt} — "
            f"ce facteur {direction_complete} le risque estimé{poids_str}."
        )
    else:
        phrase = (
            f"{libelle} ({valeur_fmt}) — "
            f"ce facteur {direction_complete} le risque estimé{poids_str}."
        )

    return {
        "feature": feature,
        "libelle_agent": libelle,
        "shap_value": round(shap_value, 4),
        "direction": direction,
        "valeur_brute": valeur_brute,
        "poids_pct": poids_pct,
        "explication_naturelle": phrase,
    }


def _trouver_label(valeur, seuils: list, meta: dict) -> str:
    """Trouve le label d'intervalle correspondant à la valeur brute."""
    if not seuils or valeur is None:
        return meta.get("libelle_agent", "")

    if meta.get("type") == "categorical":
        modalites = meta.get("modalites", {})
        return modalites.get(str(valeur), str(valeur))

    try:
        v = float(valeur)
        for seuil in seuils:
            if v <= seuil["max"]:
                return seuil["label"]
        return seuils[-1]["label"]
    except (TypeError, ValueError):
        return ""