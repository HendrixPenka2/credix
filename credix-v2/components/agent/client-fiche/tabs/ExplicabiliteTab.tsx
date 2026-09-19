"use client";

import { useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import { formatDateTime } from "@/lib/utils";
import type { Client } from "@/lib/types";

/** Détail complet des 5 facteurs SHAP + Flux B du dernier scoring — cf. cdc_credix.md §5.2, onglet 5. */
export function ExplicabiliteTab({ client }: { client: Client }) {
  const { data, loading } = useApi(useCallback(() => scoringRepository.getScoringHistory(client.client_id, 1), [client.client_id]));

  if (loading) return <SkeletonCard className="h-64" />;

  const latest = data?.historique?.[0];
  if (!latest) {
    return <EmptyState icon="neurology" title="Aucune explication disponible" description="Ce client n'a pas encore de scoring à expliquer." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="p-card-padding">
        <div className="flex items-center justify-between mb-1">
          <CardTitle>Explicabilité du score (XAI)</CardTitle>
          <span className="font-body-sm text-on-surface-variant">{formatDateTime(latest.timestamp)}</span>
        </div>
        <p className="font-body-sm text-on-surface-variant mb-4">
          Les 5 facteurs qui ont le plus contribué au score {latest.score_pdo}, du plus au moins influent.
        </p>
        <ShapBlock items={latest.shap_top5} />
      </Card>

      <AnomalyPanel data={latest} />
    </div>
  );
}
