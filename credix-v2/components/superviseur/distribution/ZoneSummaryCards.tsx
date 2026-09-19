import { Card } from "@/components/ui/card";
import { formatPd } from "@/lib/utils";
import type { ScoreBands } from "@/lib/types";

interface ZoneAgg {
  label: string;
  count: number;
  pct: number;
  pdMoyenne: number | null;
  tone: string;
  border: string;
}

function aggregate(bands: ScoreBands): ZoneAgg[] {
  const { refuse, accorde } = bands.seuils_pdo;
  const zones: Record<"refus" | "revue" | "accord", { count: number; pct: number; pdSum: number; n: number }> = {
    refus: { count: 0, pct: 0, pdSum: 0, n: 0 },
    revue: { count: 0, pct: 0, pdSum: 0, n: 0 },
    accord: { count: 0, pct: 0, pdSum: 0, n: 0 },
  };
  for (const t of bands.tranches) {
    const key = t.borne_inf < refuse ? "refus" : t.borne_inf < accorde ? "revue" : "accord";
    zones[key].count += t.count;
    zones[key].pct += t.pct_portfolio;
    if (t.pd_moyenne != null) {
      zones[key].pdSum += t.pd_moyenne * t.count;
      zones[key].n += t.count;
    }
  }
  return [
    { label: "Refus", ...zones.refus, tone: "text-danger-rose", border: "border-l-danger-rose" },
    { label: "Revue manuelle", ...zones.revue, tone: "text-warning-amber", border: "border-l-warning-amber" },
    { label: "Accord", ...zones.accord, tone: "text-success-emerald", border: "border-l-success-emerald" },
  ].map((z) => ({ label: z.label, count: z.count, pct: z.pct, pdMoyenne: z.n > 0 ? z.pdSum / z.n : null, tone: z.tone, border: z.border }));
}

export function ZoneSummaryCards({ bands }: { bands: ScoreBands }) {
  const zones = aggregate(bands);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {zones.map((z) => (
        <Card key={z.label} className={`p-card-padding border-l-4 ${z.border}`}>
          <p className="font-label-md text-on-surface-variant uppercase tracking-wider">{z.label}</p>
          <p className="font-data-lg text-on-surface mt-1">{z.count.toLocaleString("fr-FR")}</p>
          <p className={`font-body-sm mt-1 ${z.tone}`}>{z.pct.toFixed(1)}% du portefeuille</p>
          {z.pdMoyenne != null && <p className="font-body-sm text-on-surface-variant mt-1">PD moyenne : {formatPd(z.pdMoyenne)}</p>}
        </Card>
      ))}
    </div>
  );
}
