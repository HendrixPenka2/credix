"""
Service PSI — Population Stability Index
=========================================
Mesure la dérive de la distribution d'une variable entre deux périodes.

DEUX FONCTIONS :
  calculer_psi()           → Score PDO (300-850), bins fixes
  calculer_psi_generique() → N'importe quelle variable (WOE, etc.), bins par quantiles

RÈGLE D'INTERPRÉTATION (identique pour les deux) :
  PSI < 0.10  → STABLE    — aucune action requise
  PSI < 0.25  → ATTENTION — surveiller, pas d'action immédiate
  PSI ≥ 0.25  → DÉRIVE    — réentraînement recommandé

POURQUOI LE PSI DÉTECTE LA DÉRIVE :
  Il compare COMMENT les valeurs se distribuent, pas leur moyenne.
  Exemple : moyenne EXT_SOURCE_3 identique mais distribution bimodale
  → PSI élevé même si la moyenne n'a pas bougé.
"""
import numpy as np
from typing import List, Optional


def calculer_psi(scores_reference: List[float], scores_actuels: List[float], bins: int = 10) -> float:
    """
    PSI spécialisé pour les scores PDO (plage 300–850, bins fixes).

    Utilisé par : GET /api/monitoring/model-drift

    COMMENT ÇA MARCHE (exemple) :
      Référence : [604, 499, 553, ...]   → 40% dans le bin 500-600
      Actuel    : [620, 580, 610, ...]   → 25% dans le bin 500-600
      Contribution de ce bin : (0.25 - 0.40) × ln(0.25/0.40) = +0.07
      PSI total = somme de toutes les contributions → si > 0.25 : DÉRIVE
    """
    if len(scores_reference) < 10 or len(scores_actuels) < 10:
        return 0.0

    # Bins fixes : adapté car le score PDO a une plage connue (300-850)
    breakpoints = np.linspace(300, 850, bins + 1)

    ref_counts, _ = np.histogram(scores_reference, bins=breakpoints)
    act_counts, _ = np.histogram(scores_actuels, bins=breakpoints)

    ref_pct = ref_counts / len(scores_reference)
    act_pct = act_counts / len(scores_actuels)

    # Éviter log(0) — remplacer les zéros par une valeur epsilon
    ref_pct = np.where(ref_pct == 0, 0.0001, ref_pct)
    act_pct = np.where(act_pct == 0, 0.0001, act_pct)

    psi = np.sum((act_pct - ref_pct) * np.log(act_pct / ref_pct))
    return round(float(psi), 4)


def calculer_psi_generique(
    ref: List[float],
    act: List[float],
    bins: int = 10
) -> Optional[float]:
    """
    PSI générique pour n'importe quelle variable continue.

    Utilisé par : GET /api/monitoring/feature-drift (une appel par feature NAP)

    DIFFÉRENCE AVEC calculer_psi() :
      calculer_psi()         → bins FIXES  (300-850), adapté au score PDO
      calculer_psi_generique → bins par QUANTILES de la référence

    Pourquoi des bins par quantiles pour les features WOE ?
      Les valeurs WOE n'ont pas de plage fixe connue.
      EXT_SOURCE_3 WOE peut aller de -2.5 à +3.0 selon les données.
      Utiliser np.quantile(ref, ...) garantit des bins équilibrés
      dans la référence (même nombre d'observations par bin),
      ce qui rend le PSI plus robuste.

    Retourne None si données insuffisantes (< 10 dans ref OU act).
    None ≠ 0.0 : None = "on ne sait pas" ; 0.0 = "stable confirmé".
    """
    if len(ref) < 10 or len(act) < 10:
        return None

    # Bins depuis les quantiles de la distribution de référence
    breakpoints = np.unique(np.quantile(ref, np.linspace(0, 1, bins + 1)))

    # Cas dégénéré : variable constante ou presque (ex: feature toujours 0.0)
    if len(breakpoints) < 3:
        return 0.0

    ref_counts, _ = np.histogram(ref, bins=breakpoints)
    act_counts, _ = np.histogram(act, bins=breakpoints)

    ref_pct = ref_counts / len(ref)
    act_pct = act_counts / len(act)

    ref_pct = np.where(ref_pct == 0, 0.0001, ref_pct)
    act_pct = np.where(act_pct == 0, 0.0001, act_pct)

    psi = np.sum((act_pct - ref_pct) * np.log(act_pct / ref_pct))
    return round(float(psi), 4)


def interpreter_psi(psi: float) -> dict:
    """Interprète une valeur PSI en statut + message."""
    if psi < 0.10:
        return {
            "statut": "STABLE",
            "couleur": "vert",
            "message": "Distribution stable — aucune action requise"
        }
    elif psi < 0.25:
        return {
            "statut": "ATTENTION",
            "couleur": "orange",
            "message": "Légère dérive détectée — surveiller"
        }
    else:
        return {
            "statut": "DERIVE",
            "couleur": "rouge",
            "message": "Dérive significative — réentraînement recommandé"
        }