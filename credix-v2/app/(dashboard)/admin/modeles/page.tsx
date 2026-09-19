"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { ModelVersionsTable, ProductionHighlight } from "@/components/superviseur/modele/ModelVersionsTable";
import { UploadModelModal } from "@/components/admin/modeles/UploadModelModal";
import { PromoteConfirmModal } from "@/components/admin/modeles/PromoteConfirmModal";
import type { ModelVersion } from "@/lib/types";

export default function AdminModelesPage() {
  const { data, loading, error, refetch } = useApi(useCallback(() => monitoringRepository.getModelVersions(), []));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [promoteCandidate, setPromoteCandidate] = useState<ModelVersion | null>(null);

  const production = data?.versions.find((v) => v.statut === "PRODUCTION");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Modèles</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Gestion complète des versions du modèle de scoring.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Icon name="upload" size={18} />
          Nouveau modèle
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <>
          <SkeletonCard />
          <SkeletonTable rows={5} cols={8} />
        </>
      ) : (
        <>
          {production && <ProductionHighlight version={production} />}
          <ModelVersionsTable
            versions={data.versions}
            renderActions={(v) =>
              v.statut === "STAGING" ? (
                <Button size="sm" variant="secondary" onClick={() => setPromoteCandidate(v)}>
                  Promouvoir
                </Button>
              ) : null
            }
          />
        </>
      )}

      <UploadModelModal open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={refetch} />
      <PromoteConfirmModal candidate={promoteCandidate} current={production} onOpenChange={(open) => !open && setPromoteCandidate(null)} onPromoted={refetch} />
    </div>
  );
}
