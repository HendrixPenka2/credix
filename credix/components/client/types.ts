import { ShapItem } from '@/lib/types';

/** Item retourné par GET /api/scoring/history/{id} */
export interface HistoryItem {
  demande_id?: string;
  timestamp: string;
  score_pdo: number;
  pd_c: number;
  rho_c: number;
  /** Peut être string directe ou objet { valeur } selon l'endpoint */
  decision: string | { valeur: string };
  decision_finale?: string | { valeur: string };
  decision_initiale?: string | { valeur: string } | null;
  decision_avant_if?: string | null;  // champ MongoDB — décision LightGBM avant escalade IF
  shap_top5?: ShapItem[];
  model_version?: string;
  // ── Isolation Forest ─────────────────────────────────────────────────────
  if_escalade?: boolean;
  anomaly_score?: number | null;
  is_anomaly?: boolean;
  if_seuil?: number | null;
  override_superviseur?: boolean;
}

/** Extrait la valeur string d'une décision (string | {valeur} | null) */
export function getDecisionVal(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d === 'object' && d !== null && 'valeur' in d) {
    return (d as { valeur: string }).valeur;
  }
  return String(d);
}

/** Classes CSS selon la décision */
export function decisionCls(decision: string): string {
  const d = getDecisionVal(decision).toUpperCase();
  if (d === 'ACCORDE')        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  if (d === 'REFUSE')         return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
  if (d === 'REVUE_MANUELLE') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
}