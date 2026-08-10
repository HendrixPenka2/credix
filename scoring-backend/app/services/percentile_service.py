"""
Service Percentile — Comparaison au profil moyen (Fonctionnalité F2)
Calcule dans quel percentile se situe le score d'un client par rapport aux décisions récentes.
"""
import math


def calculer_percentile(score: int, scores_recents: list) -> dict:
    """
    Calcule le percentile du score du client dans la distribution des scores récents.
    scores_recents : liste de scores PDO des 30 derniers jours
    """
    if not scores_recents:
        return {"percentile": None, "message": "Pas assez de données historiques"}

    rang = sum(1 for s in scores_recents if s < score)
    percentile = round((rang / len(scores_recents)) * 100)

    if percentile >= 80:
        qualif = "excellents"
        message = f"Ce client est dans le top {100 - percentile}% des dossiers examinés ce mois."
    elif percentile >= 60:
        qualif = "bons"
        message = f"Ce client présente un profil supérieur à {percentile}% des dossiers récents."
    elif percentile >= 40:
        qualif = "moyens"
        message = f"Ce client se situe dans la moyenne des dossiers examinés ce mois."
    elif percentile >= 20:
        qualif = "limites"
        message = f"Ce client présente un profil plus risqué que {100 - percentile}% des dossiers récents."
    else:
        qualif = "risqués"
        message = f"Ce client est parmi les {percentile + 5}% de dossiers les plus risqués du mois."

    return {
        "percentile": percentile,
        "score_client": score,
        "nb_dossiers_reference": len(scores_recents),
        "message": message,
        "qualification": qualif
    }
