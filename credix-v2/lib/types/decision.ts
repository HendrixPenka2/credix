import { ClientProfile } from "./client";
import { ShapItem, RecommandationRho, FacteurAnomalie } from "./scoring";

export interface Decision {
  demande_id: string;
  client_id: string;
  timestamp: string;
  pd_c: number;
  score_pdo: number;
  decision_initiale: { valeur: string };
  decision_finale: { valeur: string };
  rho_c: number;
  shap_top5: ShapItem[];
  override_superviseur: boolean;
  model_version: string;
}

export interface DecisionPendingReview {
  demande_id: string;
  client_id: string;
  timestamp: string;
  score_pdo: number;
  pd_c: number;
  rho_c: number;
  shap_top5: ShapItem[];
  recommandation_rho: RecommandationRho;
  client_nom: string;
  client_prenom: string;
  // ── Anomalie (Flux B) — toujours afficher quand présent ─────────────────
  anomaly_score?: number | null;
  is_anomaly?: boolean;
  if_escalade?: boolean;
  if_detecteur?: "autoencoder" | "isolation_forest" | null;
  top_facteurs_anomalie?: FacteurAnomalie[] | null;
  // ── Profil complet + données de la demande ──────────────────────────────
  client_profile?: ClientProfile;
  client_features?: Record<string, any>;
  declaratif?: Record<string, any>;
}

export interface OverrideStats {
  total_revue: number;
  total_overrides: number;
  overrides_accordes: number;
  overrides_refuses: number;
  taux_override_pct: number;
  taux_accord_pct: number;
  taux_desaccord_modele: number;
  interpretation: string;
}

export interface ScoreProgression {
  client_id: string;
  nb_scorings: number;
  historique: Array<{
    demande_id: string;
    timestamp: string;
    score_pdo: number;
    pd_c: number;
    rho_c: number;
    decision: string;
  }>;
  premier_scoring?: { date: string; score: number; rho: number; decision: string };
  dernier_scoring?: { date: string; score: number; rho: number; decision: string };
  delta_score: number;
  delta_rho: number;
  tendance_score: string;
  tendance_rho: string;
  resume?: string;
  message?: string;
}

export interface MyDecisionItem {
  demande_id: string;
  client_id: string;
  timestamp: string;
  score_pdo: number;
  pd_c: number;
  rho_c: number;
  decision_finale: { valeur: string };
  is_anomaly?: boolean;
  if_escalade?: boolean;
  client_nom?: string;
  client_prenom?: string;
}

export interface MyDecisionsResponse {
  decisions: MyDecisionItem[];
  total: number;
  periode: string;
}

export interface OverrideHistoryItem {
  demande_id: string;
  client_id: string;
  score_pdo: number;
  decision_finale: { valeur: string };
  commentaire_superviseur: string;
  override_at: string;
  client_nom?: string;
  client_prenom?: string;
}

export interface MyOverridesResponse {
  overrides: OverrideHistoryItem[];
  total: number;
}
