"""
Router dashboard — statistiques et visualisations du portefeuille

ENDPOINTS :
  GET /api/dashboard/statistics                   Statistiques globales
  GET /api/dashboard/score-distribution           Distribution scores (histogramme)
  GET /api/dashboard/client-percentile/{cid}/{did} Percentile d'un client
  GET /api/dashboard/portfolio-risk               [F3 — NOUVEAU] Risque portefeuille
  GET /api/dashboard/score-bands                  [S4 — NOUVEAU] Analyse par tranches

SEUILS — RÈGLE D'OR :
  Seuils PDO (accorde/refuse) → lus depuis admin_config MongoDB (configurables via API)
  Seuils rho_c (banniere/revue) → lus depuis settings (config.py / .env — non modifiables via API)
"""
from fastapi import APIRouter, Depends, Query, Request
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.security import require_agent, require_superviseur
from app.db.collections import col_decisions, col_admin_config
from app.services.psi_service import calculer_psi, interpreter_psi

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_seuils_pdo() -> dict:
    """Lit les seuils PDO depuis admin_config (identique à scoring.py)."""
    config = await col_admin_config().find_one({"type": "seuils_pdo"})
    if config:
        return {
            "accorde": config.get("accorde", settings.pdo_seuil_accorde),
            "refuse":  config.get("refuse",  settings.pdo_seuil_refuse),
        }
    return {"accorde": settings.pdo_seuil_accorde, "refuse": settings.pdo_seuil_refuse}


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS EXISTANTS (inchangés)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/statistics")
async def get_statistics(
    periode: str = Query("30j", pattern="^(7j|30j|90j|all)$"),
    current_user: dict = Depends(require_agent)
):
    """Statistiques globales des décisions pour le tableau de bord."""
    filtre = {}
    if periode != "all":
        jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
        depuis = datetime.now(timezone.utc) - timedelta(days=jours)
        filtre["timestamp"] = {"$gte": depuis}

    pipeline = [
        {"$match": filtre},
        {"$group": {
            "_id": "$decision_finale.valeur",
            "count": {"$sum": 1},
            "score_moyen": {"$avg": "$score_pdo"},
            "rho_moyen": {"$avg": "$rho_c"},
        }}
    ]
    stats_raw = await col_decisions().aggregate(pipeline).to_list(10)
    total = sum(s["count"] for s in stats_raw)
    stats = {
        s["_id"]: {"count": s["count"], "pct": round(s["count"] / total * 100, 1) if total else 0}
        for s in stats_raw
    }
    return {
        "periode": periode, "total_demandes": total, "par_decision": stats,
        "accordes": stats.get("ACCORDE", {}).get("count", 0),
        "refuses":  stats.get("REFUSE",  {}).get("count", 0),
        "revues":   stats.get("REVUE_MANUELLE", {}).get("count", 0),
        "taux_revue_pct": stats.get("REVUE_MANUELLE", {}).get("pct", 0),
    }


@router.get("/score-distribution")
async def get_score_distribution(
    periode: str = Query("30j", pattern="^(7j|30j|90j)$"),
    current_user: dict = Depends(require_agent)
):
    """Distribution des scores PDO par tranches de 50 points (histogramme brut)."""
    jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
    depuis = datetime.now(timezone.utc) - timedelta(days=jours)
    pipeline = [
        {"$match": {"timestamp": {"$gte": depuis}}},
        {"$bucket": {
            "groupBy": "$score_pdo",
            "boundaries": list(range(300, 901, 50)),
            "default": "Autres",
            "output": {"count": {"$sum": 1}}
        }}
    ]
    distribution = await col_decisions().aggregate(pipeline).to_list(20)
    return {"periode": periode, "distribution": distribution}



@router.get("/anomaly-statistics")
async def get_anomaly_statistics(
    periode: str = Query("30j", pattern="^(7j|30j|90j|all)$"),
    current_user: dict = Depends(require_agent)
):
    """
    Statistiques sur la couche de détection d'anomalie (Autoencoder).

    OBJECTIF :
      Démontrer concrètement la valeur ajoutée de la couche de sécurité IA :
      combien de dossiers initialement ACCORDÉS par le score PDO ont été
      interceptés et basculés en REVUE_MANUELLE car jugés atypiques par
      l'Autoencoder (reconstruction MSE > seuil P99).

    DONNÉES : collection decisions — champs anomaly_score, is_anomaly,
      if_escalade, if_seuil (présents sur toutes les décisions depuis
      l'intégration de l'Autoencoder).

    RETOURNE :
      nb_dossiers_analyses  → nombre de décisions avec anomaly_score renseigné
      nb_anomalies          → nombre de profils jugés atypiques (is_anomaly=true)
      taux_anomalie_pct     → % de profils atypiques sur la période
      nb_escalades          → nombre de dossiers ACCORDE → REVUE forcés (if_escalade=true)
      taux_escalade_pct     → % de dossiers interceptés
      anomaly_score_moyen   → score d'anomalie moyen du portefeuille
      seuil_anomalie        → seuil de détection utilisé (référence)
    """
    filtre = {}
    if periode != "all":
        jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
        depuis = datetime.now(timezone.utc) - timedelta(days=jours)
        filtre["timestamp"] = {"$gte": depuis}

    filtre["anomaly_score"] = {"$ne": None}

    decisions = await col_decisions().find(
        filtre,
        {"_id": 0, "anomaly_score": 1, "is_anomaly": 1, "if_escalade": 1, "if_seuil": 1}
    ).to_list(5000)

    n = len(decisions)
    if n == 0:
        return {
            "periode": periode,
            "nb_dossiers_analyses": 0,
            "nb_anomalies": 0,
            "taux_anomalie_pct": 0.0,
            "nb_escalades": 0,
            "taux_escalade_pct": 0.0,
            "anomaly_score_moyen": None,
            "seuil_anomalie": None,
            "message": "Aucune donnée de détection d'anomalie sur cette période.",
        }

    scores       = [d["anomaly_score"] for d in decisions if d.get("anomaly_score") is not None]
    nb_anomalies = sum(1 for d in decisions if d.get("is_anomaly"))
    nb_escalades = sum(1 for d in decisions if d.get("if_escalade"))
    seuils       = [d["if_seuil"] for d in decisions if d.get("if_seuil") is not None]

    return {
        "periode"              : periode,
        "nb_dossiers_analyses" : n,
        "nb_anomalies"         : nb_anomalies,
        "taux_anomalie_pct"    : round(nb_anomalies / n * 100, 1),
        "nb_escalades"         : nb_escalades,
        "taux_escalade_pct"    : round(nb_escalades / n * 100, 1),
        "anomaly_score_moyen"  : round(sum(scores) / len(scores), 5) if scores else None,
        "seuil_anomalie"       : seuils[0] if seuils else None,
    }

@router.get("/client-percentile/{client_id}/{demande_id}")
async def get_client_percentile(
    client_id: str,
    demande_id: str,
    current_user: dict = Depends(require_superviseur)
):
    """Percentile du score d'un client par rapport aux décisions du mois."""
    from app.services.percentile_service import calculer_percentile
    decision = await col_decisions().find_one({"demande_id": demande_id}, {"score_pdo": 1})
    if not decision:
        return {"percentile": None, "message": "Décision introuvable"}
    depuis = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    scores_cursor = col_decisions().find({"timestamp": {"$gte": depuis}}, {"score_pdo": 1, "_id": 0})
    scores = [d["score_pdo"] async for d in scores_cursor]
    return calculer_percentile(decision["score_pdo"], scores)


# ─────────────────────────────────────────────────────────────────────────────
# F3 — GET /api/dashboard/portfolio-risk
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/portfolio-risk")
async def get_portfolio_risk(
    periode: str = Query("30j", pattern="^(7j|30j|90j|all)$"),
    current_user: dict = Depends(require_superviseur)
):
    filtre = {}
    if periode != "all":
        jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
        depuis = datetime.now(timezone.utc) - timedelta(days=jours)
        filtre["timestamp"] = {"$gte": depuis}
 
    decisions = await col_decisions().find(
        filtre,
        {"score_pdo": 1, "pd_c": 1, "rho_c": 1, "decision_finale": 1, "_id": 0}
    ).limit(2000).to_list(2000)
 
    if not decisions:
        return {"periode": periode, "nb_dossiers_scores": 0,
                "message": "Aucun scoring dans cette période."}
 
    n      = len(decisions)
    pds    = [d["pd_c"]      for d in decisions if d.get("pd_c")      is not None]
    scores = [d["score_pdo"] for d in decisions if d.get("score_pdo") is not None]
    rhos   = [d["rho_c"]     for d in decisions if d.get("rho_c")     is not None]
 
    def _mediane(lst):
        if not lst: return None
        s = sorted(lst); mid = len(s) // 2
        return round(s[mid] if len(s) % 2 else (s[mid-1] + s[mid]) / 2, 4)
 
    distribution = {}
    for d in decisions:
        val = d.get("decision_finale", {}).get("valeur", "INCONNU")
        distribution[val] = distribution.get(val, 0) + 1
 
    seuil_banniere     = settings.rho_seuil_banniere
    seuil_revue_forcee = settings.rho_seuil_revue_forcee
 
    nb_thin_file = sum(1 for r in rhos if r < seuil_banniere)
    nb_critique  = sum(1 for r in rhos if r < seuil_revue_forcee)
 
    pd_moy = round(sum(pds) / len(pds), 4) if pds else None
    pd_med = _mediane(pds)
    sc_moy = round(sum(scores) / len(scores), 1) if scores else None
 
    taux_thin     = round(nb_thin_file / n * 100, 1) if rhos else 0.0
    taux_critique = round(nb_critique  / n * 100, 1) if rhos else 0.0
 
    # ── Seuil d'alerte configurable (admin_config) ────────────────────────────
    cfg_seuil = await col_admin_config().find_one({"type": "seuil_alerte_pd"})
    seuil_pd  = cfg_seuil.get("seuil", 0.20) if cfg_seuil else 0.20
 
    # ── Logique d'alerte multi-métriques (moyenne + médiane) ─────────────────
    alerte        = None
    niveau_alerte = None
 
    if pd_moy is not None and pd_med is not None:
        if pd_moy > seuil_pd * 1.5 or pd_med > seuil_pd:
            niveau_alerte = "CRITIQUE"
            alerte = (f"Risque critique — PD moyenne {pd_moy*100:.1f}%, "
                      f"médiane {pd_med*100:.1f}% — action immédiate requise")
        elif pd_moy > seuil_pd and pd_med > seuil_pd * 0.75:
            niveau_alerte = "ÉLEVÉ"
            alerte = (f"PD élevée confirmée — moyenne {pd_moy*100:.1f}%, "
                      f"médiane {pd_med*100:.1f}% — révision des seuils recommandée")
        elif pd_moy > seuil_pd:
            niveau_alerte = "ATTENTION"
            alerte = (f"PD moyenne élevée ({pd_moy*100:.1f}%) mais médiane normale "
                      f"({pd_med*100:.1f}%) — dossiers outliers à investiguer")
    elif pd_moy and pd_moy > seuil_pd:
        niveau_alerte = "ATTENTION"
        alerte = f"PD moyenne élevée ({pd_moy*100:.1f}%) — révision recommandée"
 
    if not alerte and taux_thin > 50:
        niveau_alerte = "ATTENTION"
        alerte = f"Taux thin-file élevé ({taux_thin}%) — enrichissement documentaire requis"
 
    return {
        "periode"              : periode,
        "nb_dossiers_scores"   : n,
        "pd_moyenne"           : pd_moy,
        "pd_mediane"           : pd_med,
        "pd_max"               : round(max(pds), 4) if pds else None,
        "score_moyen"          : sc_moy,
        "score_median"         : _mediane(scores),
        "distribution"         : distribution,
        "taux_thin_file_pct"   : taux_thin,
        "taux_critique_pct"    : taux_critique,
        "seuils_appliques"     : {"rho_banniere": seuil_banniere, "rho_critique": seuil_revue_forcee},
        "seuil_alerte_pd"      : seuil_pd,
        "alerte"               : alerte,
        "niveau_alerte"        : niveau_alerte,
    }


# ─────────────────────────────────────────────────────────────────────────────
# S4 — GET /api/dashboard/score-bands
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/score-bands")
async def get_score_bands(
    periode: str = Query("30j", pattern="^(7j|30j|90j|all)$"),
    current_user: dict = Depends(require_superviseur)
):
    """
    Analyse du portefeuille par tranches de score PDO calibrées.

    DYNAMISME DES BORNES :
      Les bornes clés (seuil_refuse et seuil_accorde) sont lues depuis admin_config
      au moment de chaque appel. Si l'admin change les seuils PDO, les tranches
      et leurs labels se mettent à jour automatiquement.

    STRUCTURE DES TRANCHES :
      [300, seuil_refuse-50]  → Zone rouge (très risqué, hors zone de refus)
      [seuil_refuse-50, seuil_refuse]  → Zone orange (risqué)
      [seuil_refuse, milieu]  → Zone frontière basse
      [milieu, seuil_accorde] → Zone frontière haute
      [seuil_accorde, seuil_accorde+50] → Zone verte
      [seuil_accorde+50, 851] → Zone excellente

    FINENESS TEST :
      La PD doit décroître monotonement quand le score monte.
      Si ce n'est pas le cas → problème de calibration du modèle.
    """
    # Lire les seuils PDO configurés par l'admin
    seuils = await _get_seuils_pdo()
    s_refuse  = int(seuils["refuse"])   # ex : 500
    s_accorde = int(seuils["accorde"])  # ex : 600
    milieu    = (s_refuse + s_accorde) // 2  # ex : 550

    # Construction des bornes dynamiques
    # On s'assure que les valeurs sont dans la plage 300-850 et strictement croissantes
    b1 = max(350, s_refuse - 50)
    b2 = s_refuse
    b3 = milieu
    b4 = s_accorde
    b5 = min(800, s_accorde + 50)
    boundaries = sorted(set([300, b1, b2, b3, b4, b5, 851]))

    # Labels dynamiques
    labels = {
        300 : f"Zone rouge (300–{b1-1})",
        b1  : f"Zone orange ({b1}–{b2-1})",
        b2  : f"Zone frontière basse ({b2}–{b3-1})",
        b3  : f"Zone frontière haute ({b3}–{b4-1})",
        b4  : f"Zone verte ({b4}–{b5-1})",
        b5  : f"Zone excellente ({b5}+)",
    }

    filtre = {}
    if periode != "all":
        jours = {"7j": 7, "30j": 30, "90j": 90}[periode]
        depuis = datetime.now(timezone.utc) - timedelta(days=jours)
        filtre["timestamp"] = {"$gte": depuis}

    pipeline = [
        {"$match": filtre},
        {"$bucket": {
            "groupBy": "$score_pdo",
            "boundaries": boundaries,
            "default": "Hors_plage",
            "output": {
                "count"      : {"$sum": 1},
                "pd_moyenne" : {"$avg": "$pd_c"},
                "score_moyen": {"$avg": "$score_pdo"},
                "rho_moyen"  : {"$avg": "$rho_c"},
                "nb_accordes": {"$sum": {"$cond": [{"$eq": ["$decision_finale.valeur", "ACCORDE"]},  1, 0]}},
                "nb_refuses" : {"$sum": {"$cond": [{"$eq": ["$decision_finale.valeur", "REFUSE"]},   1, 0]}},
                "nb_revues"  : {"$sum": {"$cond": [{"$eq": ["$decision_finale.valeur", "REVUE_MANUELLE"]}, 1, 0]}},
            }
        }}
    ]

    bands_raw = await col_decisions().aggregate(pipeline).to_list(10)
    total = sum(b.get("count", 0) for b in bands_raw if b["_id"] != "Hors_plage")

    bands = []
    for b in bands_raw:
        if b["_id"] == "Hors_plage":
            continue
        count = b.get("count", 0)
        bands.append({
            "borne_inf"    : b["_id"],
            "libelle"      : labels.get(b["_id"], str(b["_id"])),
            "count"        : count,
            "pct_portfolio": round(count / total * 100, 1) if total else 0.0,
            "pd_moyenne"   : round(b.get("pd_moyenne") or 0, 4),
            "score_moyen"  : round(b.get("score_moyen") or 0, 1),
            "rho_moyen"    : round(b.get("rho_moyen")  or 0, 3),
            "nb_accordes"  : b.get("nb_accordes", 0),
            "nb_refuses"   : b.get("nb_refuses",  0),
            "nb_revues"    : b.get("nb_revues",   0),
        })

    bands.sort(key=lambda x: x["borne_inf"])

    return {
        "periode"          : periode,
        "total_dossiers"   : total,
        "seuils_pdo"       : {"refuse": s_refuse, "accorde": s_accorde},
        "tranches"         : bands,
        "note_calibration" : (
            "Fineness test : la pd_moyenne doit décroître quand la borne_inf augmente. "
            "Une inversion indique un problème de calibration du modèle."
        )
    }