"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { PeriodSelector, type Periode } from "@/components/agent/dashboard/PeriodSelector";
import { StatCards } from "@/components/agent/dashboard/StatCards";
import { AnomalyInsights } from "@/components/agent/dashboard/AnomalyInsights";
import { ScoreHistogram } from "@/components/agent/dashboard/ScoreHistogram";
import { QuickActions } from "@/components/agent/dashboard/QuickActions";
import { RecentScorings } from "@/components/agent/dashboard/RecentScorings";
import { ThinFileWatch } from "@/components/agent/dashboard/ThinFileWatch";

export default function AgentDashboardPage() {
  const [periode, setPeriode] = useState<Periode>("30j");

  const statsApi = useApi(useCallback(() => dashboardRepository.getStatistics(periode), [periode]));
  const anomalyApi = useApi(useCallback(() => dashboardRepository.getAnomalyStatistics(periode), [periode]));
  const distributionApi = useApi(useCallback(() => dashboardRepository.getScoreDistribution(periode), [periode]));
  const recentApi = useApi(useCallback(() => clientsRepository.getRecentlyScored(6), []));
  const thinFileApi = useApi(useCallback(() => clientsRepository.searchClients({ rho_max: 0.42, limit: 5 }), []));

  const hasError = statsApi.error || anomalyApi.error || distributionApi.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Tableau de bord</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Vue d&apos;ensemble de vos activités de scoring récentes.</p>
        </div>
        <PeriodSelector value={periode} onChange={setPeriode} />
      </div>

      {hasError ? (
        <ErrorState message={statsApi.error ?? anomalyApi.error ?? distributionApi.error ?? undefined} onRetry={() => { statsApi.refetch(); anomalyApi.refetch(); distributionApi.refetch(); }} />
      ) : (
        <>
          <StatCards stats={statsApi.data} loading={statsApi.loading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AnomalyInsights stats={anomalyApi.data} loading={anomalyApi.loading} />
              <ScoreHistogram distribution={distributionApi.data} loading={distributionApi.loading} />
            </div>
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            <RecentScorings clients={recentApi.data?.clients ?? null} loading={recentApi.loading} />
            <ThinFileWatch clients={thinFileApi.data?.clients ?? null} loading={thinFileApi.loading} />
          </div>
        </>
      )}
    </div>
  );
}
