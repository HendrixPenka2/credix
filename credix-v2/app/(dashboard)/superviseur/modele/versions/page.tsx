"use client";

import { useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { ReadOnlyBanner } from "@/components/superviseur/modele/ReadOnlyBanner";
import { ModelVersionsTable, ProductionHighlight } from "@/components/superviseur/modele/ModelVersionsTable";

export default function SuperviseurModelVersionsPage() {
  const { data, loading, error, refetch } = useApi(useCallback(() => monitoringRepository.getModelVersions(), []));

  const production = data?.versions.find((v) => v.statut === "PRODUCTION");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Versions du modèle</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Historique des versions du modèle de scoring.</p>
      </div>

      <ReadOnlyBanner description="Vous consultez l'historique des versions du modèle. Seul un administrateur peut importer ou promouvoir une nouvelle version." />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <>
          <SkeletonCard />
          <SkeletonTable rows={5} cols={7} />
        </>
      ) : (
        <>
          {production && <ProductionHighlight version={production} />}
          <ModelVersionsTable versions={data.versions} />
        </>
      )}
    </div>
  );
}
