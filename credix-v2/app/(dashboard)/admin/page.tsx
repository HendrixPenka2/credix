"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonStatCards, SkeletonCard } from "@/components/ui/skeleton";
import { AdminKpis } from "@/components/admin/overview/AdminKpis";
import { ActivityCard } from "@/components/admin/overview/ActivityCard";
import { ModelVersionsTable } from "@/components/superviseur/modele/ModelVersionsTable";
import { UploadModelModal } from "@/components/admin/modeles/UploadModelModal";
import { PromoteConfirmModal } from "@/components/admin/modeles/PromoteConfirmModal";
import type { ModelVersion } from "@/lib/types";

export default function AdminOverviewPage() {
  const usersApi = useApi(useCallback(() => adminRepository.getUsers(), []));
  const versionsApi = useApi(useCallback(() => monitoringRepository.getModelVersions(), []));
  const auditApi = useApi(useCallback(() => monitoringRepository.getAuditLogs({ limite: 5 }), []));

  const [uploadOpen, setUploadOpen] = useState(false);
  const [promoteCandidate, setPromoteCandidate] = useState<ModelVersion | null>(null);

  const loading = usersApi.loading || versionsApi.loading || auditApi.loading;
  const error = usersApi.error || versionsApi.error || auditApi.error;
  const production = versionsApi.data?.versions.find((v) => v.statut === "PRODUCTION");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Vue générale</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Pilotage des comptes et du cycle de vie du modèle IA.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Icon name="upload" size={18} />
          Upload nouveau modèle
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { usersApi.refetch(); versionsApi.refetch(); auditApi.refetch(); }} />
      ) : loading || !usersApi.data || !versionsApi.data || !auditApi.data ? (
        <>
          <SkeletonStatCards count={4} />
          <div className="grid lg:grid-cols-3 gap-6">
            <SkeletonCard className="h-64 lg:col-span-2" />
            <SkeletonCard className="h-64" />
          </div>
        </>
      ) : (
        <>
          <AdminKpis users={usersApi.data.users} versions={versionsApi.data.versions} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ModelVersionsTable
                versions={versionsApi.data.versions}
                renderActions={(v) =>
                  v.statut === "STAGING" ? (
                    <Button size="sm" variant="secondary" onClick={() => setPromoteCandidate(v)}>
                      Promouvoir
                    </Button>
                  ) : null
                }
              />
            </div>
            <ActivityCard total={auditApi.data.total} lastLogs={auditApi.data.logs} />
          </div>
        </>
      )}

      <UploadModelModal open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={versionsApi.refetch} />
      <PromoteConfirmModal candidate={promoteCandidate} current={production} onOpenChange={(open) => !open && setPromoteCandidate(null)} onPromoted={versionsApi.refetch} />
    </div>
  );
}
