"use client";

import { useCallback } from "react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonStatCards, SkeletonChart } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import { HistCharts } from "./HistCharts";
import { HistTable } from "./HistTable";

export function HistPanel({ clientId }: { clientId: string }) {
  const { data, loading, error, refetch } = useApi(useCallback(() => scoringRepository.getScoringHistory(clientId, 50), [clientId]));

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStatCards count={4} />
        <SkeletonChart />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data || data.historique.length === 0) {
    return <EmptyState icon="history" title="Aucun historique" description="Ce client n'a pas encore été scoré." />;
  }

  const sorted = [...data.historique].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const delta = latest.score_pdo - oldest.score_pdo;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Dernier score" value={latest.score_pdo} icon="speed" />
        <KpiCard label="Dernière décision" value={<DecisionBadge decision={latest.decision} />} icon="gavel" />
        <KpiCard label="Couverture ρc" value={`${Math.round(latest.rho_c * 100)}%`} icon="donut_large" />
        <KpiCard
          label={`Évolution (${sorted.length} dossiers)`}
          value={`${delta > 0 ? "+" : ""}${delta}`}
          icon={delta >= 0 ? "trending_up" : "trending_down"}
          tone={delta > 0 ? "success" : delta < 0 ? "danger" : "neutral"}
        />
      </div>

      <HistCharts historique={data.historique} />
      <HistTable historique={data.historique} />
    </div>
  );
}
