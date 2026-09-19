"use client";

import { useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonStatCards, SkeletonTable, SkeletonCard } from "@/components/ui/skeleton";
import { OverrideKpis } from "@/components/superviseur/mes-validations/OverrideKpis";
import { OverrideDonut } from "@/components/superviseur/mes-validations/OverrideDonut";
import { AlignmentInsight } from "@/components/superviseur/mes-validations/AlignmentInsight";
import { OverrideHistoryTable } from "@/components/superviseur/mes-validations/OverrideHistoryTable";

export default function MesValidationsPage() {
  const statsApi = useApi(useCallback(() => decisionsRepository.getOverrideStats(), []));
  const overridesApi = useApi(useCallback(() => decisionsRepository.getMyOverrides(100), []));

  const loading = statsApi.loading || overridesApi.loading;
  const error = statsApi.error || overridesApi.error;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Mes validations</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Historique en lecture seule de vos décisions de revue.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { statsApi.refetch(); overridesApi.refetch(); }} />
      ) : loading || !statsApi.data || !overridesApi.data ? (
        <>
          <SkeletonStatCards count={4} />
          <div className="grid lg:grid-cols-3 gap-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64 lg:col-span-2" />
          </div>
          <SkeletonTable rows={6} cols={5} />
        </>
      ) : (
        <>
          <OverrideKpis stats={statsApi.data} />
          <div className="grid lg:grid-cols-3 gap-6">
            <OverrideDonut stats={statsApi.data} />
            <div className="lg:col-span-2">
              <AlignmentInsight stats={statsApi.data} />
            </div>
          </div>
          <OverrideHistoryTable overrides={overridesApi.data.overrides} />
        </>
      )}
    </div>
  );
}
