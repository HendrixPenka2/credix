import { KpiCard } from "@/components/shared/KpiCard";
import { SkeletonStatCards } from "@/components/ui/skeleton";
import type { DashboardStatistics } from "@/lib/types";

export function StatCards({ stats, loading }: { stats: DashboardStatistics | null; loading: boolean }) {
  if (loading || !stats) return <SkeletonStatCards count={4} />;

  const accordes = stats.par_decision["ACCORDE"];
  const refuses = stats.par_decision["REFUSE"];
  const revues = stats.par_decision["REVUE_MANUELLE"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Dossiers scorés" value={stats.total_demandes.toLocaleString("fr-FR")} icon="folder_open" />
      <KpiCard
        label="Accordés"
        value={`${accordes?.count ?? 0} (${(accordes?.pct ?? 0).toFixed(1)}%)`}
        icon="check_circle"
        tone="success"
        variant="border"
      />
      <KpiCard
        label="En revue"
        value={`${revues?.count ?? 0} (${(revues?.pct ?? 0).toFixed(1)}%)`}
        icon="pending_actions"
        tone="warning"
        variant="border"
      />
      <KpiCard
        label="Refusés"
        value={`${refuses?.count ?? 0} (${(refuses?.pct ?? 0).toFixed(1)}%)`}
        icon="cancel"
        tone="danger"
        variant="border"
      />
    </div>
  );
}
