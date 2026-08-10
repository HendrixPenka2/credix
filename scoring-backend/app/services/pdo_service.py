"""
Service Score PDO
Formule : Score = 515.06 - 28.85 * ln(PD / (1 - PD))
Ancrage : PD=5% -> Score=600, PDO=20

Offset/Factor = convention d'échelle "type A" (RAPPORT_BK1 §3.9) : NE CHANGENT
JAMAIS, indépendants des données. Ce qui change (Jeu 2, "type B") ce sont les
FRONTIÈRES de décision (seuils accorde/refuse), configurables par l'admin,
par défaut sourcées de decision_config.json (cf. app/main.py::charger_seuils).

IMPORTANT : pd_to_score()/get_decision() attendent une PD DÉJÀ CALIBRÉE
(cf. app/services/calibration_service.py — régression isotonique BK.1). Une PD
brute (predict_proba non calibré) est gonflée par scale_pos_weight (~4,6x) et
produit un score/une décision faux. La calibration doit toujours avoir lieu
en amont, jamais ici.

CORRECTION SESSION 5 — Règle de décision thin-file :

AVANT :
  rho_c < 0.25 → REVUE_MANUELLE (indépendamment du score)
  Problème : un client avec score 300 ET dossier vide passait en REVUE
  inutilement. Le superviseur voyait le dossier vide et refusait de toute façon.

APRÈS :
  rho_c < 0.25 ET score < seuil_refuse → REFUSÉ direct
    (mauvais score + dossier vide = rien à sauver — décision immédiate)
  rho_c < 0.25 ET score ≥ seuil_refuse → REVUE_MANUELLE
    (score acceptable mais dossier vide = demander les documents manquants)
  rho_c ≥ 0.25 → décision automatique normale (ACCORDÉ / REVUE / REFUSÉ)

Justification métier :
  On ne refuse jamais un client UNIQUEMENT parce qu'il n'a pas d'historique.
  Mais si son score est mauvais ET son dossier vide, le refus est justifié
  et ne nécessite pas d'intervention humaine.
"""
import math
from app.core.config import settings


OFFSET = 515.06
FACTOR = 20 / math.log(2)  # = 28.854


def pd_to_score(pd: float) -> int:
    """Convertit une probabilité de défaut en score PDO."""
    pd = max(0.0001, min(0.9999, pd))  # évite log(0) et log(inf)
    log_odds = math.log(pd / (1 - pd))
    score = OFFSET - FACTOR * log_odds
    return max(300, min(850, round(score)))


def get_decision(score: int, rho_c: float, seuils: dict) -> str:
    """
    Règle de décision complète.

    Paramètres :
      score       : Score PDO calculé (300–850)
      rho_c       : Indice de couverture prédictive (0–1)
      seuils      : Dict {"accorde": float, "refuse": float} configuré par l'admin

    Logique :

    ┌─────────────────────────────────────────────────────────────┐
    │  DOSSIER VIDE (rho_c < seuil_revue_forcee, ex : 0.25)      │
    │  → score < seuil_refuse : REFUSÉ                           │
    │    (mauvais score + données insuffisantes = refus direct)   │
    │  → score ≥ seuil_refuse : REVUE_MANUELLE                   │
    │    (score passable mais dossier vide = demander documents)  │
    ├─────────────────────────────────────────────────────────────┤
    │  DOSSIER SUFFISANT (rho_c ≥ seuil_revue_forcee)             │
    │  → score ≥ seuil_accorde : ACCORDÉ automatique             │
    │  → score < seuil_refuse  : REFUSÉ automatique              │
    │  → sinon                 : REVUE_MANUELLE                  │
    └─────────────────────────────────────────────────────────────┘
    """
    seuil_accorde = seuils.get("accorde", settings.pdo_seuil_accorde)
    seuil_refuse  = seuils.get("refuse",  settings.pdo_seuil_refuse)

    # ── Thin-file (dossier insuffisant) ───────────────────────────────────────
    if rho_c < settings.rho_seuil_revue_forcee:
        if score < seuil_refuse:
            # Mauvais score ET dossier vide → refus direct, pas de revue inutile
            return "REFUSE"
        # Score acceptable mais dossier vide → superviseur demande les documents
        return "REVUE_MANUELLE"

    # ── Dossier suffisant → décision automatique normale ──────────────────────
    if score >= seuil_accorde:
        return "ACCORDE"
    if score < seuil_refuse:
        return "REFUSE"
    return "REVUE_MANUELLE"