// Valeurs exactes envoyées par le backend FastAPI (sans accents)
export type DecisionValue = "ACCORDE" | "REFUSE" | "REVUE_MANUELLE";

export interface LastScore {
  score_pdo: number;
  decision: DecisionValue | string;
  pd_c: number;
  date: string;
  demande_id?: string;
  anomaly_score?: number | null;
  is_anomaly?: boolean;
  if_escalade?: boolean;
  if_seuil?: number | null;
  decision_initiale?: string | null;
}

export interface ShapItem {
  feature: string;
  libelle_agent: string;
  shap_value: number;
  direction: "aggravant" | "attenuant";
  valeur_brute?: any;
  poids_pct?: number | null;
  explication_naturelle: string;
}

/**
 * Facteur explicatif d'anomalie (Flux B — autoencodeur uniquement).
 * Champ backend `top_facteurs_anomalie`, ajouté par le diff non commité de
 * scoring.py/pipeline_service.py/shap_service.py (voir Partie 3 du plan) —
 * additif, donc toujours optionnel/nullable côté client. Ne jamais rendre ce
 * bloc obligatoire dans l'UI : `null` quand is_anomaly=false ou détecteur
 * Isolation Forest (seul l'autoencodeur les produit).
 */
export interface FacteurAnomalie {
  feature: string;
  libelle_agent: string;
  erreur_reconstruction: number;
  valeur_brute?: any;
  explication_naturelle: string;
}

export interface DocumentRecommande {
  feature: string;
  libelle: string;
  document: string;
  iv: number;
  gain_rho_estime: string;
}

export interface RecommandationRho {
  afficher: boolean;
  niveau_urgence?: "CRITIQUE" | "ATTENTION" | string;
  message?: string;
  cas4?: boolean;
  documents_recommandes?: DocumentRecommande[];
  rho_potentiel_max?: string;
}

export interface PercentileData {
  percentile?: number | null;
  score_client?: number;
  nb_dossiers_reference?: number;
  message?: string;
  qualification?: "excellents" | "bons" | "moyens" | "limites" | "risqués" | string;
}

/** Champs Flux B (garde-fou anomalie) communs à predict/simulate/history. */
export interface AnomalyFields {
  anomaly_score: number | null;
  is_anomaly: boolean;
  if_escalade: boolean;
  if_seuil?: number | null;
  if_detecteur: "autoencoder" | "isolation_forest" | null;
  if_percentile: number;
  top_facteurs_anomalie?: FacteurAnomalie[] | null;
}

export interface ScoringResult extends AnomalyFields {
  demande_id: string;
  client_id: string;
  pd_c: number;
  score_pdo: number;
  decision: DecisionValue | string;
  rho_c: number;
  shap_top5: ShapItem[];
  recommandation_rho: RecommandationRho;
  percentile: PercentileData;
  model_version: string;
  timestamp: string;
  // ── Calibration isotonique ─────────────────────────────────────────────
  pd_c_brute: number;
  calibration_appliquee: boolean;
  decision_initiale: string | null;
}

export interface SimulationResult extends AnomalyFields {
  pd_c: number;
  pd_c_brute: number;
  calibration_appliquee: boolean;
  score_pdo: number;
  decision: DecisionValue | string;
  rho_c: number;
  recommandation_rho?: RecommandationRho;
  shap_top3: ShapItem[];
  is_simulation: boolean;
}

export interface FormChamp {
  nom: string;
  label: string;
  type: string;
  obligatoire: boolean;
  min?: number;
  max?: number;
  options?: string[];
  is_request_specific?: boolean;
}

export interface FormSchema {
  champs: FormChamp[];
  run_id: string;
  nb_features_modele: number;
}

export interface ScoringHistoryItem extends AnomalyFields {
  demande_id: string;
  timestamp: string;
  score_pdo: number;
  decision: string;
  decision_initiale?: string | null;
  pd_c: number;
  rho_c: number;
  shap_top5: ShapItem[];
  decision_avant_if?: string | null;
  model_version: string;
  declaratif?: Record<string, any>;
}
