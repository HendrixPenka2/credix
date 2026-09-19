"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AuditFiltersBar, type AuditFilters } from "@/components/admin/audit/AuditFiltersBar";
import { AuditLogsTable } from "@/components/admin/audit/AuditLogsTable";

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ userId: "", action: "all" });
  const [limite, setLimite] = useState(50);

  const { data, loading, error, refetch } = useApi(
    useCallback(
      () =>
        monitoringRepository.getAuditLogs({
          action: filters.action !== "all" ? filters.action : undefined,
          user_id: filters.userId.trim() || undefined,
          limite,
        }),
      [filters, limite]
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Journal d&apos;audit</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Historique chronologique de toutes les actions de la plateforme.</p>
      </div>

      <AuditFiltersBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setLimite(50);
        }}
        actionsDisponibles={data?.actions_disponibles ?? []}
      />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <SkeletonTable rows={10} cols={5} />
      ) : (
        <>
          <AuditLogsTable logs={data.logs} />
          <div className="flex flex-col items-center gap-2">
            <p className="font-body-sm text-on-surface-variant">
              {data.logs.length} action{data.logs.length > 1 ? "s" : ""} affichée{data.logs.length > 1 ? "s" : ""} sur {data.total}
            </p>
            {data.logs.length < data.total && (
              <Button variant="outline" onClick={() => setLimite((l) => l + 50)}>
                <Icon name="expand_more" size={16} />
                Charger plus
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
