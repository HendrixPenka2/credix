import { KpiCard } from "@/components/shared/KpiCard";
import type { OverrideStats } from "@/lib/types";

export function OverrideKpis({ stats }: { stats: OverrideStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Dossiers en revue" value={stats.total_revue} icon="inbox" />
      <KpiCard label="Dossiers tranchés" value={stats.total_overrides} icon="task_alt" />
      <KpiCard label="Taux d'accord" value={`${stats.taux_accord_pct.toFixed(1)}%`} icon="check_circle" tone="success" variant="border" />
      <KpiCard
        label="Désaccord avec le modèle"
        value={`${stats.taux_desaccord_modele.toFixed(1)}%`}
        icon="rule"
        tone={stats.taux_desaccord_modele > 30 ? "warning" : "neutral"}
        variant="border"
      />
    </div>
  );
}
