import { KpiCard } from "@/components/shared/KpiCard";
import { formatPd } from "@/lib/utils";
import type { PortfolioRisk, AnomalyStatistics, OverrideStats } from "@/lib/types";

export interface PortfolioKpisProps {
  portfolioRisk: PortfolioRisk;
  pendingCount: number;
  anomalyStats: AnomalyStatistics;
  overrideStats: OverrideStats;
}

/** 8 cartes KPI — cf. cdc_credix.md §5.3 /superviseur. */
export function PortfolioKpis({ portfolioRisk, pendingCount, anomalyStats, overrideStats }: PortfolioKpisProps) {
  const accorde = portfolioRisk.distribution["ACCORDE"] ?? 0;
  const tauxAccord = portfolioRisk.nb_dossiers_scores > 0 ? (accorde / portfolioRisk.nb_dossiers_scores) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Dossiers scorés" value={portfolioRisk.nb_dossiers_scores} icon="folder_open" />
      <KpiCard
        label="PD moyenne / médiane"
        value={`${portfolioRisk.pd_moyenne != null ? formatPd(portfolioRisk.pd_moyenne) : "—"} / ${portfolioRisk.pd_mediane != null ? formatPd(portfolioRisk.pd_mediane) : "—"}`}
        icon="query_stats"
      />
      <KpiCard label="Taux thin-file" value={`${portfolioRisk.taux_thin_file_pct}%`} icon="description" tone={portfolioRisk.taux_thin_file_pct > 30 ? "warning" : "neutral"} variant="border" />
      <KpiCard label="Dossiers en attente" value={pendingCount} icon="pending_actions" tone="warning" variant="border" />
      <KpiCard label="Score moyen" value={portfolioRisk.score_moyen != null ? Math.round(portfolioRisk.score_moyen) : "—"} icon="speed" />
      <KpiCard label="Taux d'accord" value={`${tauxAccord.toFixed(1)}%`} icon="check_circle" tone="success" variant="border" />
      <KpiCard
        label="Interceptés par anomalie"
        value={anomalyStats.nb_escalades}
        icon="troubleshoot"
        tone={anomalyStats.nb_escalades > 0 ? "warning" : "neutral"}
        variant="border"
      />
      <KpiCard label="Mes validations" value={overrideStats.total_overrides} icon="task_alt" tone="violet" variant="border" />
    </div>
  );
}
