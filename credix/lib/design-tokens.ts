/**
 * Source unique des styles sémantiques (couleur ⇔ signification métier).
 *
 * Avant cette refonte, la même logique (ex. "ρc < 0.25 → rouge") était
 * réimplémentée indépendamment dans ~7 fichiers différents, avec des palettes
 * légèrement différentes à chaque fois (red vs rose, green vs emerald...).
 * Toute nouvelle page qui a besoin d'un badge décision/ρc/PSI/rôle/statut doit
 * passer par une des fonctions ci-dessous — jamais réimplémenter le mapping.
 */

export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';

export interface ToneStyle {
  tone: Tone;
  label: string;
  /** Badge plein (fond teinté + texte + bordure assortie). */
  badge: string;
  /** Texte seul, sans fond (pour valeurs chiffrées inline). */
  text: string;
  /** Couleur "pleine" pour un point/pastille/barre de progression. */
  dot: string;
  /** Couleur hex — pour Recharts, qui n'accepte pas les classes Tailwind. */
  hex: string;
}

const TONE_STYLES: Record<Tone, Omit<ToneStyle, 'label' | 'tone'>> = {
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    hex: '#10b981',
  },
  danger: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    hex: '#e11d48',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    hex: '#d97706',
  },
  info: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
    hex: '#0284c7',
  },
  brand: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    hex: '#2563eb',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
    hex: '#64748b',
  },
};

function style(tone: Tone, label: string): ToneStyle {
  return { tone, label, ...TONE_STYLES[tone] };
}

// ── Décision de crédit ──────────────────────────────────────────────────────

export function getDecisionStyle(decision?: string | null): ToneStyle {
  const d = decision?.toUpperCase();
  if (d === 'ACCORDE' || d === 'ACCORDÉ') return style('success', 'ACCORDÉ');
  if (d === 'REFUSE' || d === 'REFUSÉ') return style('danger', 'REFUSÉ');
  if (d === 'REVUE_MANUELLE' || d === 'EN REVUE') return style('warning', 'EN REVUE');
  return style('neutral', decision ?? '—');
}

// ── Couverture ρc ────────────────────────────────────────────────────────────

export function getRhoStyle(rho: number): ToneStyle {
  if (rho < 0.25) return style('danger', 'Critique');
  if (rho < 0.40) return style('warning', 'Partielle');
  return style('success', 'Suffisante');
}

// ── PSI / dérive du modèle ───────────────────────────────────────────────────

export function getPsiStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === 'STABLE') return style('success', 'Stable');
  if (s === 'ATTENTION') return style('warning', 'Attention');
  if (s === 'DERIVE' || s === 'DÉRIVE') return style('danger', 'Dérive');
  return style('neutral', 'Insuffisant');
}

export function psiStyleFromValue(value?: number | null): ToneStyle {
  if (value == null) return getPsiStyle('INSUFFISANT');
  if (value < 0.1) return getPsiStyle('STABLE');
  if (value < 0.25) return getPsiStyle('ATTENTION');
  return getPsiStyle('DERIVE');
}

// ── Statut de version de modèle ──────────────────────────────────────────────

export function getModelStatusStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === 'PRODUCTION') return style('success', 'Production');
  if (s === 'STAGING') return style('info', 'Staging');
  return style('neutral', 'Archive');
}

// ── Rôle utilisateur ─────────────────────────────────────────────────────────

export function getRoleStyle(role?: string | null): ToneStyle {
  const r = role?.toUpperCase();
  if (r === 'ADMIN') return style('danger', 'Admin');
  if (r === 'SUPERVISEUR') return { ...style('info', 'Superviseur'),
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500', hex: '#7c3aed' };
  return style('brand', 'Agent');
}

// ── Statut générique succès/échec (audit, actions) ──────────────────────────

export function getOutcomeStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === 'SUCCES' || s === 'SUCCÈS') return style('success', 'Succès');
  if (s === 'ECHEC' || s === 'ÉCHEC') return style('danger', 'Échec');
  return style('neutral', statut ?? '—');
}

// ── Détecteur Flux B (anomalie) ──────────────────────────────────────────────

export function getAnomalyStyle(isAnomaly?: boolean | null): ToneStyle {
  if (isAnomaly == null) return style('neutral', 'Non évalué');
  return isAnomaly ? style('danger', 'Profil atypique') : style('success', 'Profil normal');
}
