"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonChart, SkeletonStatCards } from "@/components/ui/skeleton";
import { PeriodSelector, type Periode } from "@/components/agent/dashboard/PeriodSelector";
import { ScoreDistributionChart } from "@/components/superviseur/distribution/ScoreDistributionChart";
import { ZoneSummaryCards } from "@/components/superviseur/distribution/ZoneSummaryCards";

export default function DistributionPage() {
  const [periode, setPeriode] = useState<Periode>("30j");
  const distributionApi = useApi(useCallback(() => dashboardRepository.getScoreDistribution(periode), [periode]));
  const bandsApi = useApi(useCallback(() => dashboardRepository.getScoreBands(periode), [periode]));

  const loading = distributionApi.loading || bandsApi.loading;
  const error = distributionApi.error || bandsApi.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Distribution des scores</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Répartition du portefeuille selon les 3 zones de décision actives.</p>
        </div>
        <PeriodSelector value={periode} onChange={setPeriode} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { distributionApi.refetch(); bandsApi.refetch(); }} />
      ) : loading || !distributionApi.data || !bandsApi.data ? (
        <>
          <SkeletonStatCards count={3} />
          <SkeletonChart />
        </>
      ) : (
        <>
          <ZoneSummaryCards bands={bandsApi.data} />
          <ScoreDistributionChart
            distribution={distributionApi.data}
            seuilRefuse={bandsApi.data.seuils_pdo.refuse}
            seuilAccorde={bandsApi.data.seuils_pdo.accorde}
          />
        </>
      )}
    </div>
  );
}
