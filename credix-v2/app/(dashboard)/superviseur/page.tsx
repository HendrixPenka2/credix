"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonStatCards, SkeletonCard } from "@/components/ui/skeleton";
import { PeriodSelector, type Periode } from "@/components/agent/dashboard/PeriodSelector";
import { AlertBanner } from "@/components/superviseur/overview/AlertBanner";
import { PortfolioKpis } from "@/components/superviseur/overview/PortfolioKpis";
import { DecisionStackedBar } from "@/components/superviseur/overview/DecisionStackedBar";
import { UrgentQueue } from "@/components/superviseur/overview/UrgentQueue";
import { ModelHealthCard } from "@/components/superviseur/overview/ModelHealthCard";

export default function SuperviseurOverviewPage() {
  const [periode, setPeriode] = useState<Periode>("30j");

  const portfolioApi = useApi(useCallback(() => dashboardRepository.getPortfolioRisk(periode), [periode]));
  const pendingApi = useApi(useCallback(() => decisionsRepository.getPendingReviews(), []));
  const anomalyApi = useApi(useCallback(() => dashboardRepository.getAnomalyStatistics(periode), [periode]));
  const overrideApi = useApi(useCallback(() => decisionsRepository.getOverrideStats(), []));
  const driftApi = useApi(useCallback(() => monitoringRepository.getModelDrift(), []));
  const versionsApi = useApi(useCallback(() => monitoringRepository.getModelVersions(), []));

  const loading = portfolioApi.loading || pendingApi.loading || anomalyApi.loading || overrideApi.loading || driftApi.loading || versionsApi.loading;
  const error = portfolioApi.error || pendingApi.error || anomalyApi.error || overrideApi.error || driftApi.error || versionsApi.error;

  const production = versionsApi.data?.versions.find((v) => v.statut === "PRODUCTION");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Vue d&apos;ensemble du portefeuille</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Pilotage de l&apos;activité de scoring et de la santé du modèle.</p>
        </div>
        <PeriodSelector value={periode} onChange={setPeriode} />
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            portfolioApi.refetch();
            pendingApi.refetch();
            anomalyApi.refetch();
            overrideApi.refetch();
            driftApi.refetch();
            versionsApi.refetch();
          }}
        />
      ) : loading || !portfolioApi.data || !pendingApi.data || !anomalyApi.data || !overrideApi.data || !driftApi.data ? (
        <>
          <SkeletonStatCards count={8} />
          <div className="grid lg:grid-cols-3 gap-6">
            <SkeletonCard className="h-64 lg:col-span-2" />
            <SkeletonCard className="h-64" />
          </div>
        </>
      ) : portfolioApi.data.nb_dossiers_scores === 0 ? (
        <ErrorState message="Aucun dossier scoré sur cette période." onRetry={portfolioApi.refetch} />
      ) : (
        <>
          <AlertBanner portfolioRisk={portfolioApi.data} />
          <PortfolioKpis
            portfolioRisk={portfolioApi.data}
            pendingCount={pendingApi.data.total}
            anomalyStats={anomalyApi.data}
            overrideStats={overrideApi.data}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <UrgentQueue dossiers={pendingApi.data.dossiers} />
              <DecisionStackedBar distribution={portfolioApi.data.distribution} />
            </div>
            <ModelHealthCard drift={driftApi.data} production={production} />
          </div>
        </>
      )}
    </div>
  );
}
