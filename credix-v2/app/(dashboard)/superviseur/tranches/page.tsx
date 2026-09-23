"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { PeriodSelector, type Periode } from "@/components/agent/dashboard/PeriodSelector";
import { CalibrationBanner } from "@/components/superviseur/tranches/CalibrationBanner";
import { ScoreBandsTable } from "@/components/superviseur/tranches/ScoreBandsTable";
import { InfoCallout } from "@/components/shared/InfoCallout";

export default function TranchesPage() {
  const [periode, setPeriode] = useState<Periode>("30j");
  const { data, loading, error, refetch } = useApi(useCallback(() => dashboardRepository.getScoreBands(periode), [periode]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Tranches de risque</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Test de cohérence de la calibration du modèle par tranche de score.</p>
        </div>
        <PeriodSelector value={periode} onChange={setPeriode} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <>
          <SkeletonCard />
          <SkeletonTable rows={6} cols={7} />
        </>
      ) : data.total_dossiers === 0 ? (
        <EmptyState icon="table_chart" title="Aucun dossier sur la période" description="Élargissez la période pour voir les tranches de risque." />
      ) : (
        <>
          <CalibrationBanner bands={data} />
          <ScoreBandsTable tranches={data.tranches} />
          <InfoCallout icon="insights" title="Comprendre cette page">
            <p>
              Cette page ne concerne pas un client en particulier : elle regroupe tous les dossiers scorés par tranche de
              score (300-350, 350-400...) pour vérifier que le modèle reste cohérent sur l&apos;ensemble du portefeuille.
            </p>
            <p>
              Principe de base : plus le score est élevé, plus le risque moyen (PD) doit être bas, tranche après tranche.
              Le bandeau en haut vérifie automatiquement cette règle et alerte en cas d&apos;anomalie de calibration.
            </p>
          </InfoCallout>
        </>
      )}
    </div>
  );
}
