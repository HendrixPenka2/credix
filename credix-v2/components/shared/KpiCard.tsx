import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design-tokens";
import { TONE_ICON_CHIP, TONE_BORDER, TONE_SOLID_BG } from "./tone-classes";

export interface KpiTrend {
  value: string;
  direction: "up" | "down" | "flat";
  /** Sens de la tendance : "up" n'est pas toujours positif (ex: PD moyenne qui monte est mauvais). */
  tone?: Tone;
}

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: string;
  tone?: Tone;
  /** "border" = liseré gauche coloré (dashboard agent), "chip" = icône en pastille colorée (vue générale admin). */
  variant?: "border" | "chip" | "plain";
  trend?: KpiTrend;
  /** Pilule pleine pour les métriques "à traiter" (ex: "URGENT", "NEEDS REVIEW"). */
  attentionPill?: string;
  className?: string;
}

const TREND_ICON: Record<KpiTrend["direction"], string> = {
  up: "trending_up",
  down: "trending_down",
  flat: "trending_flat",
};

export function KpiCard({ label, value, icon, tone = "neutral", variant = "plain", trend, attentionPill, className }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "p-card-padding relative overflow-hidden",
        variant === "border" && `border-l-4 ${TONE_BORDER[tone]}`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-label-md text-on-surface-variant uppercase tracking-wider">{label}</p>
        {icon &&
          (variant === "chip" ? (
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", TONE_ICON_CHIP[tone])}>
              <Icon name={icon} size={18} />
            </span>
          ) : (
            <Icon name={icon} size={20} className="text-outline shrink-0" />
          ))}
      </div>
      <p className="font-data-lg text-on-surface mt-2 tabular-nums">{value}</p>
      {attentionPill ? (
        <span className={cn("inline-flex items-center mt-3 rounded-full px-2.5 py-1 font-label-md", TONE_SOLID_BG[tone])}>
          {attentionPill}
        </span>
      ) : trend ? (
        <span className={cn("inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 font-label-md", TONE_ICON_CHIP[trend.tone ?? tone])}>
          <Icon name={TREND_ICON[trend.direction]} size={14} />
          {trend.value}
        </span>
      ) : null}
    </Card>
  );
}
