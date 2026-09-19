/**
 * Source unique des styles sémantiques (couleur ⇔ signification métier).
 *
 * Toute page qui a besoin d'un badge décision/ρc/PSI/rôle/statut/anomalie doit
 * passer par une des fonctions ci-dessous — jamais réimplémenter le mapping
 * couleur ailleurs. Basé sur les tokens du design system Stitch validé
 * (stitch_credix_design_system/credix_system/DESIGN.md) : les couleurs
 * sémantiques (success-emerald/warning-amber/danger-rose/supervisor-violet/
 * simulation-orange) sont des hex fixes qui fonctionnent tels quels en clair
 * comme en sombre via l'opacité (bg-success-emerald/10), donc aucune variante
 * `dark:` n'est nécessaire ici (contrairement à l'ancienne palette Tailwind
 * par défaut qui en avait besoin).
 */

export type Tone = "success" | "danger" | "warning" | "info" | "neutral" | "violet" | "orange";

export interface ToneStyle {
  tone: Tone;
  label: string;
  /** Badge plein (fond teinté + texte + bordure assortie). */
  badge: string;
  /** Texte seul, sans fond (pour valeurs chiffrées inline). */
  text: string;
  /** Couleur "pleine" pour un point/pastille/barre de progression. */
  dot: string;
  /** Couleur hex — pour Recharts et le SVG des jauges, qui n'acceptent pas les classes Tailwind. */
  hex: string;
}

const TONE_STYLES: Record<Tone, Omit<ToneStyle, "label" | "tone">> = {
  success: {
    badge: "bg-success-emerald/10 text-success-emerald border-success-emerald/20",
    text: "text-success-emerald",
    dot: "bg-success-emerald",
    hex: "#10b981",
  },
  danger: {
    badge: "bg-danger-rose/10 text-danger-rose border-danger-rose/20",
    text: "text-danger-rose",
    dot: "bg-danger-rose",
    hex: "#f43f5e",
  },
  warning: {
    badge: "bg-warning-amber/10 text-warning-amber border-warning-amber/20",
    text: "text-warning-amber",
    dot: "bg-warning-amber",
    hex: "#f59e0b",
  },
  info: {
    badge: "bg-secondary/10 text-secondary border-secondary/20",
    text: "text-secondary",
    dot: "bg-secondary",
    hex: "#4648d4",
  },
  violet: {
    badge: "bg-supervisor-violet/10 text-supervisor-violet border-supervisor-violet/20",
    text: "text-supervisor-violet",
    dot: "bg-supervisor-violet",
    hex: "#7c3aed",
  },
  orange: {
    badge: "bg-simulation-orange/10 text-simulation-orange border-simulation-orange/20",
    text: "text-simulation-orange",
    dot: "bg-simulation-orange",
    hex: "#fb923c",
  },
  neutral: {
    badge: "bg-outline-variant/20 text-on-surface-variant border-outline-variant/40",
    text: "text-on-surface-variant",
    dot: "bg-outline",
    hex: "#76777d",
  },
};

function style(tone: Tone, label: string): ToneStyle {
  return { tone, label, ...TONE_STYLES[tone] };
}

/** Classes du badge plein pour un ton donné — pour un usage ad hoc hors des helpers spécialisés ci-dessous. */
export function toneBadgeClass(tone: Tone): string {
  return TONE_STYLES[tone].badge;
}

// ── Décision de crédit ──────────────────────────────────────────────────────

export function getDecisionStyle(decision?: string | null): ToneStyle {
  const d = decision?.toUpperCase();
  if (d === "ACCORDE" || d === "ACCORDÉ") return style("success", "ACCORDÉ");
  if (d === "REFUSE" || d === "REFUSÉ") return style("danger", "REFUSÉ");
  if (d === "REVUE_MANUELLE" || d === "EN REVUE") return style("warning", "EN REVUE");
  return style("neutral", decision ?? "—");
}

// ── Couverture ρc ────────────────────────────────────────────────────────────

export function getRhoStyle(rho: number): ToneStyle {
  if (rho < 0.25) return style("danger", "Critique");
  if (rho < 0.42) return style("warning", "Partielle");
  return style("success", "Suffisante");
}

export function rhoTier(rho: number): "critique" | "partielle" | "suffisante" {
  if (rho < 0.25) return "critique";
  if (rho < 0.42) return "partielle";
  return "suffisante";
}

// ── PSI / dérive du modèle ───────────────────────────────────────────────────

export function getPsiStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === "STABLE") return style("success", "Stable");
  if (s === "ATTENTION") return style("warning", "Attention");
  if (s === "DERIVE" || s === "DÉRIVE") return style("danger", "Dérive");
  return style("neutral", "Insuffisant");
}

export function psiStyleFromValue(value?: number | null): ToneStyle {
  if (value == null) return getPsiStyle("INSUFFISANT");
  if (value < 0.1) return getPsiStyle("STABLE");
  if (value < 0.25) return getPsiStyle("ATTENTION");
  return getPsiStyle("DERIVE");
}

// ── Statut de version de modèle ──────────────────────────────────────────────

export function getModelStatusStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === "PRODUCTION") return style("success", "Production");
  if (s === "STAGING") return style("orange", "Staging");
  return style("neutral", "Archivé");
}

// ── Rôle utilisateur ─────────────────────────────────────────────────────────
// Trois traitements distincts (cf. gestion_des_comptes_admin_credix) : Admin en
// pilule pleine (couleur "primary" = noir/blanc selon le thème), Superviseur en
// pilule teintée violette, Agent en pilule neutre/outline.

export interface RoleStyle extends ToneStyle {
  /** Rendu spécifique pilule pleine (admin), teintée (superviseur) ou neutre (agent). */
  variant: "solid" | "tinted" | "outline";
}

export function getRoleStyle(role?: string | null): RoleStyle {
  const r = role?.toUpperCase();
  if (r === "ADMIN") {
    return {
      ...style("neutral", "Admin"),
      badge: "bg-primary text-on-primary border-primary",
      variant: "solid",
    };
  }
  if (r === "SUPERVISEUR") {
    return { ...style("violet", "Superviseur"), variant: "tinted" };
  }
  return {
    ...style("neutral", "Agent"),
    badge: "bg-surface-container-low text-on-surface border-outline-variant",
    variant: "outline",
  };
}

// ── Statut générique succès/échec (audit, actions) ──────────────────────────

export function getOutcomeStyle(statut?: string | null): ToneStyle {
  const s = statut?.toUpperCase();
  if (s === "SUCCES" || s === "SUCCÈS") return style("success", "Succès");
  if (s === "ECHEC" || s === "ÉCHEC") return style("danger", "Échec");
  return style("neutral", statut ?? "—");
}

// ── Détecteur Flux B (anomalie) ──────────────────────────────────────────────
// Le score d'anomalie doit rester visible partout où un dossier a été évalué
// (voir AnomalyPanel) — ce style sert aux badges compacts (tableaux, listes).

export function getAnomalyStyle(isAnomaly?: boolean | null): ToneStyle {
  if (isAnomaly == null) return style("neutral", "Non évalué");
  return isAnomaly ? style("warning", "Profil atypique") : style("success", "Profil normal");
}

// ── Échelle du score PDO (300-850) ──────────────────────────────────────────

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Position 0-1 d'un score PDO sur l'échelle 300-850, bornée — utilisé par ScoreGauge. */
export function scoreToRatio(score: number): number {
  return clamp((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN), 0, 1);
}

/**
 * Seuils PDO par défaut du backend (PDO_SEUIL_REFUSE/PDO_SEUIL_ACCORDE) —
 * repères visuels uniquement (lignes de seuil sur les graphiques). Les rôles
 * AGENT n'ont pas accès à /api/admin/thresholds (ADMIN uniquement) ; ne pas
 * s'en servir pour une décision, seulement pour l'affichage.
 */
export const DEFAULT_PDO_SEUIL_REFUSE = 540;
export const DEFAULT_PDO_SEUIL_ACCORDE = 578;

/** Seuil de couverture ρc "suffisante" par défaut (cf. cdc_credix.md §2). */
export const DEFAULT_RHO_SEUIL_SUFFISANTE = 0.42;
