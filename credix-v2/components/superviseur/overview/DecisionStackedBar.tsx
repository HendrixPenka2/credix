import { Card, CardTitle } from "@/components/ui/card";
import type { PortfolioRisk } from "@/lib/types";

const SEGMENTS: { key: string; label: string; color: string }[] = [
  { key: "ACCORDE", label: "Accordé", color: "bg-success-emerald" },
  { key: "REVUE_MANUELLE", label: "En revue", color: "bg-warning-amber" },
  { key: "REFUSE", label: "Refusé", color: "bg-danger-rose" },
];

export function DecisionStackedBar({ distribution }: { distribution: PortfolioRisk["distribution"] }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-4">Répartition des décisions</CardTitle>
      <div className="flex gap-4 mb-3 font-body-sm text-on-surface-variant">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            {s.label} {Math.round(((distribution[s.key] ?? 0) / total) * 100)}%
          </span>
        ))}
      </div>
      <div className="flex h-8 rounded-full overflow-hidden">
        {SEGMENTS.map((s) => {
          const pct = ((distribution[s.key] ?? 0) / total) * 100;
          return pct > 0 ? <div key={s.key} className={s.color} style={{ width: `${pct}%` }} /> : null;
        })}
      </div>
    </Card>
  );
}
