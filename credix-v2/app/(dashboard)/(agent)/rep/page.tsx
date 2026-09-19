"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonTable } from "@/components/ui/skeleton";
import { PeriodFilter, type ReportPeriode } from "@/components/agent/rep/PeriodFilter";
import { DecisionsTable } from "@/components/agent/rep/DecisionsTable";

export default function RepPage() {
  const [periode, setPeriode] = useState<ReportPeriode>("30j");
  const { data, loading, error, refetch } = useApi(useCallback(() => decisionsRepository.getMyDecisions(periode, 100), [periode]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Mes rapports</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Toutes les décisions que vous avez produites, avec téléchargement PDF.</p>
        </div>
        <PeriodFilter value={periode} onChange={setPeriode} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <DecisionsTable decisions={data.decisions} />
      )}
    </div>
  );
}
