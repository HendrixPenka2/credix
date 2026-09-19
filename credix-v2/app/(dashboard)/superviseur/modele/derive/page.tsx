"use client";

import { useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoCallout } from "@/components/shared/InfoCallout";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { PsiGauge } from "@/components/superviseur/modele/PsiGauge";
import { PsiInfoCard } from "@/components/superviseur/modele/PsiInfoCard";
import { getPsiStyle } from "@/lib/design-tokens";

export default function DeriveGlobalePage() {
  const { data, loading, error, refetch } = useApi(useCallback(() => monitoringRepository.getModelDrift(), []));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Dérive globale (PSI)</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Surveillance de la stabilité statistique du modèle en production.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <SkeletonCard className="h-80" />
      ) : data.psi == null ? (
        <EmptyState icon="monitoring" title={data.statut === "INCONNU" ? "Aucun modèle en production" : "Données insuffisantes"} description={data.message} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-card-padding flex flex-col items-center lg:col-span-1">
            <PsiGauge value={data.psi} />
            <div className="flex items-center gap-2 mt-2">
              <span className={`h-2 w-2 rounded-full ${getPsiStyle(data.statut).dot}`} />
              <span className="font-data-sm text-on-surface">{getPsiStyle(data.statut).label}</span>
            </div>
            <p className="font-body-sm text-on-surface-variant text-center mt-2">{data.message}</p>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <PsiInfoCard drift={data} />
            <InfoCallout title="Comprendre le PSI">
              <p>
                Le PSI (Population Stability Index) mesure l&apos;écart entre la distribution des scores actuels et celle des données
                d&apos;entraînement.
              </p>
              <p>
                <strong className="text-white">PSI &lt; 0.10</strong> : modèle stable, aucune action requise.{" "}
                <strong className="text-white">0.10 – 0.25</strong> : dérive modérée, à surveiller.{" "}
                <strong className="text-white">≥ 0.25</strong> : dérive significative, un réentraînement est recommandé.
              </p>
            </InfoCallout>
          </div>
        </div>
      )}
    </div>
  );
}
