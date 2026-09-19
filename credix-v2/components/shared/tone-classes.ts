import type { Tone } from "@/lib/design-tokens";

/** Classes Tailwind par ton — utilisées par KpiCard, ThresholdZoneVisualizer, ShapBlock, etc. */

export const TONE_BORDER: Record<Tone, string> = {
  success: "border-success-emerald",
  danger: "border-danger-rose",
  warning: "border-warning-amber",
  info: "border-secondary",
  violet: "border-supervisor-violet",
  orange: "border-simulation-orange",
  neutral: "border-outline-variant",
};

export const TONE_SOLID_BG: Record<Tone, string> = {
  success: "bg-success-emerald text-white",
  danger: "bg-danger-rose text-white",
  warning: "bg-warning-amber text-white",
  info: "bg-secondary text-on-secondary",
  violet: "bg-supervisor-violet text-white",
  orange: "bg-simulation-orange text-white",
  neutral: "bg-outline text-white",
};

export const TONE_ICON_CHIP: Record<Tone, string> = {
  success: "bg-success-emerald/10 text-success-emerald",
  danger: "bg-danger-rose/10 text-danger-rose",
  warning: "bg-warning-amber/10 text-warning-amber",
  info: "bg-secondary/10 text-secondary",
  violet: "bg-supervisor-violet/10 text-supervisor-violet",
  orange: "bg-simulation-orange/10 text-simulation-orange",
  neutral: "bg-outline-variant/20 text-on-surface-variant",
};

export const TONE_TEXT: Record<Tone, string> = {
  success: "text-success-emerald",
  danger: "text-danger-rose",
  warning: "text-warning-amber",
  info: "text-secondary",
  violet: "text-supervisor-violet",
  orange: "text-simulation-orange",
  neutral: "text-on-surface-variant",
};
