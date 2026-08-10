"""
Service ρc — Indice de Couverture Prédictive
ρc = Σ(IV_k pour k disponible) / Σ(IV_j pour les 27 features NAP)

Calculé AVANT WOE, sur les vrais NaN (après WOE, une feature absente et une
feature présente deviennent indistinguables — cf. methodologie §3.12).

CORRECTION (session 4) :
  iv_scores_final.csv contient TOUTES les features évaluées pendant
  l'entraînement (pas seulement les 27 NAP). On filtre ici sur les features
  présentes dans features_brutes (= exactement les 27 NAP assemblées par
  assembler_vecteur) pour que iv_total = somme des IV des 27 NAP uniquement.

AJOUT (Cas 4, méthodologie §7.4 / ETAT_MEMOIRE note 8) :
  Quand Ïc < seuil_revue_forcee (dossier trop incomplet), la décision automatique
  ACCORDÉ n'est jamais retenue seule — même si le score seul l'autoriserait.
  generer_recommandation() produit alors un message contextuel explicite
  expliquant ce cas plutôt qu'un message générique.
"""
import pandas as pd
from app.core.config import settings


def calculer_rho(features_brutes: dict, iv_scores: pd.DataFrame) -> dict:
    """
    Calcule ρc sur les 27 features NAP uniquement.

    features_brutes : dict {feature_name: valeur} AVANT WOE (avec vrais NaN/None).
                       Contient exactement les 27 features NAP.
    iv_scores       : DataFrame complet des IV (toutes features du notebook) —
                       filtré ici sur les 27 NAP via les clés de features_brutes.
    """
    nap_keys = set(features_brutes.keys())
    iv_dict = {
        f: iv
        for f, iv in zip(iv_scores["feature"], iv_scores["iv"])
        if f in nap_keys
    }

    iv_total = sum(iv_dict.values())

    if iv_total == 0:
        return {
            "rho": 0.0,
            "sources_disponibles": [],
            "sources_manquantes": [],
            "iv_disponible": 0.0,
            "iv_total": 0.0,
        }

    iv_disponible = 0.0
    sources_dispo = []
    sources_manquantes = []

    for feature, iv in iv_dict.items():
        valeur = features_brutes.get(feature)
        if valeur is not None and not (isinstance(valeur, float) and pd.isna(valeur)):
            iv_disponible += iv
            sources_dispo.append(feature)
        else:
            sources_manquantes.append(feature)

    rho = round(iv_disponible / iv_total, 4)

    return {
        "rho": rho,
        "sources_disponibles": sources_dispo,
        "sources_manquantes": sources_manquantes,
        "iv_disponible": round(iv_disponible, 4),
        "iv_total": round(iv_total, 4),
    }


def generer_recommandation(
    rho_data: dict,
    feature_metadata: dict,
    rho: float,
    score: int = None,
    seuil_accorde: float = None,
) -> dict:
    """
    Génère la recommandation documentaire si rho < seuil_banniere.

    score / seuil_accorde (optionnels) : permettent de détecter le Cas 4 —
    Ïc < seuil_revue_forcee ALORS QUE le score seul atteindrait déjà la
    frontière ACCORDÉ. Dans ce cas précis, le message explique pourquoi la
    décision automatique n'est pas retenue malgré un score acceptable, plutôt
    que d'afficher le message générique "dossier insuffisant".
    """
    if rho >= settings.rho_seuil_banniere:
        return {"afficher": False}

    docs = []
    for feature in rho_data["sources_manquantes"]:
        meta = feature_metadata.get(feature)
        if meta and meta.get("document_recommande"):
            iv = meta.get("iv", 0)
            gain = round(iv / rho_data["iv_total"] * 100, 1) if rho_data["iv_total"] > 0 else 0.0
            docs.append({
                "feature": feature,
                "libelle": meta.get("libelle_agent", feature),
                "document": meta["document_recommande"],
                "iv": iv,
                "gain_rho_estime": f"+{gain}%"
            })

    docs.sort(key=lambda x: x["iv"], reverse=True)

    dossier_trop_incomplet = rho < settings.rho_seuil_revue_forcee
    niveau = "CRITIQUE" if dossier_trop_incomplet else "ATTENTION"

    # ── Cas 4 : score acceptable mais couverture insuffisante ────────────────
    cas4 = (
        dossier_trop_incomplet
        and score is not None
        and seuil_accorde is not None
        and score >= seuil_accorde
    )
    if cas4:
        message = (
            f"Score acceptable ({score}) mais couverture d'information insuffisante "
            f"(Ïc={rho:.2f}, sous le seuil de {settings.rho_seuil_revue_forcee:.2f}). "
            f"La fiabilité de ce score n'est pas garantie sur un dossier aussi "
            f"incomplet (cf. preuve par tranche de Ïc) : la décision automatique "
            f"ACCORDÉ n'est donc pas retenue seule — revue manuelle requise avant octroi."
        )
    elif dossier_trop_incomplet:
        message = "Dossier insuffisant — revue manuelle obligatoire"
    else:
        message = "Confiance limitée — ce score repose principalement sur les données déclaratives"

    rho_potentiel = round(
        min(1.0, rho + sum(d["iv"] for d in docs[:3]) / rho_data["iv_total"])
        if rho_data["iv_total"] > 0 else rho,
        2
    )

    return {
        "afficher": True,
        "niveau_urgence": niveau,
        "message": message,
        "cas4": cas4,
        "documents_recommandes": docs[:5],
        "rho_potentiel_max": f"{int(rho_potentiel * 100)}%"
    }
