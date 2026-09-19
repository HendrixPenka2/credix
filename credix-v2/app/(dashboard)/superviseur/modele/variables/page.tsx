"use client";

import { useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonStatCards, SkeletonTable } from "@/components/ui/skeleton";
import { FeatureDriftSummary } from "@/components/superviseur/modele/FeatureDriftSummary";
import { FeatureDriftTable } from "@/components/superviseur/modele/FeatureDriftTable";

export default function VariablesDrivePage() {
  const { data, loading, error, refetch } = useApi(useCallback(() => monitoringRepository.getFeatureDrift(), []));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Dérive par variable</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Stabilité de chaque variable du modèle par rapport à la période de référence.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <>
          <SkeletonStatCards count={5} />
          <SkeletonTable rows={10} cols={5} />
        </>
      ) : data.statut_global === "INSUFFISANT" ? (
        <EmptyState icon="tune" title="Données insuffisantes" description="Pas assez de scorings récents pour calculer la dérive par variable." />
      ) : (
        <>
          <FeatureDriftSummary drift={data} />
          <FeatureDriftTable features={data.features} />
        </>
      )}
    </div>
  );
}
