export interface DashboardStatistics {
  periode: string;
  total_demandes: number;
  par_decision: Record<string, { count: number; pct: number }>;
  accordes: number;
  refuses: number;
  revues: number;
  taux_revue_pct: number;
}

export interface ScoreDistribution {
  periode: string;
  distribution: Array<{ _id: number | string; count: number }>;
}

export interface PortfolioRisk {
  periode: string;
  nb_dossiers_scores: number;
  pd_moyenne?: number;
  pd_mediane?: number;
  pd_max?: number;
  score_moyen?: number;
  score_median?: number;
  distribution: Record<string, number>;
  taux_thin_file_pct: number;
  taux_critique_pct: number;
  seuils_appliques: { rho_banniere: number; rho_critique: number };
  seuil_alerte_pd?: number;        // ← AJOUTÉ
  alerte?: string;
  niveau_alerte?: 'ATTENTION' | 'ÉLEVÉ' | 'CRITIQUE'; // ← AJOUTÉ
}

export interface ScoreBands {
  periode: string;
  total_dossiers: number;
  seuils_pdo: { refuse: number; accorde: number };
  tranches: Array<{
    borne_inf: number;
    libelle: string;
    count: number;
    pct_portfolio: number;
    pd_moyenne: number;
    score_moyen: number;
    rho_moyen: number;
    nb_accordes: number;
    nb_refuses: number;
    nb_revues: number;
  }>;
  note_calibration: string;
}

export interface AnomalyStatistics {
  periode: string;
  nb_dossiers_analyses: number;
  nb_anomalies: number;
  taux_anomalie_pct: number;
  nb_escalades: number;
  taux_escalade_pct: number;
  anomaly_score_moyen: number | null;
  seuil_anomalie: number | null;
  message?: string;
}