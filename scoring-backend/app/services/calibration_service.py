"""
Service de calibration — recalibration isotonique des probabilités (BK.1).

Le modèle LightGBM est entraîné avec scale_pos_weight (~11,4) pour bien détecter
les défauts rares (~10 % de la population). Ce poids gonfle les probabilités
prédites (proba moyenne annoncée ~43 % contre un taux réel ~9-10 %) : le
classement (AUC) reste bon, mais l'échelle des probabilités est fausse.

La régression isotonique (isotonic_calibrator.pkl, apprise sur la validation,
jamais réentraînée ici) corrige cette échelle. C'est une transformation
monotone : elle ne change ni l'ordre des clients ni l'AUC/Gini/KS/SHAP — elle
répare uniquement la VALEUR de la probabilité annoncée.

Référence : RAPPORT_BK1_RECALIBRATION_PDO.md / METHODO_BK1.md (Étape B, B3).
"""
import numpy as np


def calibrer_pd(pd_brute: float, calibrateur) -> float:
    """
    Applique la calibration isotonique à une probabilité de défaut brute.

    Paramètres :
      pd_brute    : proba de défaut telle que renvoyée par lgbm_model.predict_proba
                    (gonflée par scale_pos_weight, PAS exploitable telle quelle
                    pour le score PDO ni pour une décision).
      calibrateur : objet sklearn.isotonic.IsotonicRegression chargé depuis
                    isotonic_calibrator.pkl (app.state.isotonic_calibrator),
                    ou None si l'artefact n'est pas chargé.

    Retourne la PD calibrée, bornée à [0, 1].

    Si calibrateur est None, retourne pd_brute INCHANGÉE — l'appelant est
    responsable de signaler explicitement (log + champ API) que la PD n'a pas
    été calibrée. On ne masque jamais ce cas en silence : une PD non calibrée
    fausse le score PDO et donc la décision (cf. BK.1 §1.3-1.4).
    """
    if calibrateur is None:
        return pd_brute
    pd_calibree = float(calibrateur.predict(np.array([pd_brute]))[0])
    return max(0.0, min(1.0, pd_calibree))
