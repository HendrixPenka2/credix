// Valeurs exactes envoyées par le backend FastAPI (sans accents)
export type DecisionValue = 'ACCORDE' | 'REFUSE' | 'REVUE_MANUELLE';

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
  direction: 'aggravant' | 'attenuant';
  valeur_brute?: any;
  poids_pct?: number | null;
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
  niveau_urgence?: 'CRITIQUE' | 'ATTENTION' | string;
  message?: string;
  documents_recommandes?: DocumentRecommande[];
  rho_potentiel_max?: string;
}

export interface PercentileData {
  percentile?: number;
  score_client?: number;
  nb_dossiers_reference?: number;
  message?: string;
  qualification?: string;
}

export interface ScoringResult {
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
  // ── Calibration isotonique (BK.1 — refonte août 2026) ─────────────────────
  pd_c_brute: number;                // PD avant calibration isotonique (diagnostic)
  calibration_appliquee: boolean;    // false si isotonic_calibrator absent (dégradé)
  // ── Flux B — garde-fou anomalie, encodage hybride 61 dims ─────────────────
  // Présents dans TOUTES les réponses de /api/scoring/predict
  decision_initiale: string | null;  // Décision LightGBM AVANT le Flux B (ex: "ACCORDE")
  anomaly_score: number | null;      // Score du détecteur actif — plus élevé = plus anormal
  is_anomaly: boolean;               // true si le profil dépasse le seuil configuré
  if_escalade: boolean;              // true si ACCORDE → REVUE_MANUELLE forcé
  if_seuil: number | null;           // Seuil réellement utilisé
  if_detecteur: 'autoencoder' | 'isolation_forest' | null; // détecteur actif
  if_percentile: number;             // 95 ou 99, configurable admin
}

export interface SimulationResult {
  pd_c: number;
  pd_c_brute: number;
  calibration_appliquee: boolean;
  score_pdo: number;
  decision: DecisionValue | string;
  rho_c: number;
  recommandation_rho?: RecommandationRho;
  shap_top3: ShapItem[];
  is_simulation: boolean;
  anomaly_score: number | null;
  is_anomaly: boolean;
  if_escalade: boolean;
  if_detecteur: 'autoencoder' | 'isolation_forest' | null;
  if_percentile: number;
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