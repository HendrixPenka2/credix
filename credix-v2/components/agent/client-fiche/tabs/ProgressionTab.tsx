"use client";

import { useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/KpiCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoCallout } from "@/components/shared/InfoCallout";
import { SkeletonStatCards } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ProgressionTab({ client }: { client: Client }) {
  const { data, loading } = useApi(useCallback(() => clientsRepository.getScoreProgression(client.client_id), [client.client_id]));

  if (loading) return <SkeletonStatCards count={2} />;

  if (!data || data.nb_scorings === 0) {
    return <EmptyState icon="trending_up" title="Pas encore de progression" description="Au moins un scoring est nécessaire pour suivre l'évolution." />;
  }

  if (data.nb_scorings === 1) {
    return (
      <EmptyState
        icon="trending_up"
        title="Un seul scoring enregistré"
        description="La progression sera calculée dès le deuxième scoring de ce client."
      />
    );
  }

  return (
    <div className="space-y-6">
      <InfoCallout icon="trending_up" title="Comprendre cette page">
        <p>
          Cette page suit l&apos;évolution du score et de la couverture (ρc) de ce client entre son premier et son dernier
          scoring — utile pour voir si son profil de risque s&apos;améliore ou se dégrade au fil du temps.
        </p>
        <p>
          Si les scorings ont été faits avec les mêmes informations, le score ne bouge pas : &quot;+0 pts&quot; est normal,
          pas une erreur.
        </p>
      </InfoCallout>

      <div className="grid sm:grid-cols-2 gap-4">
        <KpiCard
          label="Évolution du score"
          value={`${data.delta_score > 0 ? "+" : ""}${data.delta_score} pts`}
          icon={data.delta_score >= 0 ? "trending_up" : "trending_down"}
          tone={data.delta_score > 0 ? "success" : data.delta_score < 0 ? "danger" : "neutral"}
          variant="border"
        />
        <KpiCard
          label="Évolution de la couverture"
          value={`${data.delta_rho > 0 ? "+" : ""}${Math.round(data.delta_rho * 100)} pts`}
          icon={data.delta_rho >= 0 ? "trending_up" : "trending_down"}
          tone={data.delta_rho > 0 ? "success" : data.delta_rho < 0 ? "danger" : "neutral"}
          variant="border"
        />
      </div>

      <Card className="p-card-padding">
        <CardTitle className="mb-3">Tendances</CardTitle>
        <div className="grid sm:grid-cols-2 gap-4 font-body-sm">
          <div>
            <p className="text-on-surface-variant">Tendance du score</p>
            <p className="text-on-surface font-medium mt-0.5">{data.tendance_score}</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Tendance de la couverture</p>
            <p className="text-on-surface font-medium mt-0.5">{data.tendance_rho}</p>
          </div>
        </div>
        {data.resume && <p className="font-body-sm text-on-surface-variant mt-4 pt-4 border-t border-outline-variant/60">{data.resume}</p>}
      </Card>

      <Card className="p-card-padding">
        <CardTitle className="mb-3">Repères</CardTitle>
        <div className="grid sm:grid-cols-2 gap-4 font-body-sm">
          {data.premier_scoring && (
            <div>
              <p className="text-on-surface-variant">Premier scoring — {formatDate(data.premier_scoring.date)}</p>
              <p className="text-on-surface font-mono mt-0.5">
                Score {data.premier_scoring.score} · ρc {Math.round(data.premier_scoring.rho * 100)}%
              </p>
            </div>
          )}
          {data.dernier_scoring && (
            <div>
              <p className="text-on-surface-variant">Dernier scoring — {formatDate(data.dernier_scoring.date)}</p>
              <p className="text-on-surface font-mono mt-0.5">
                Score {data.dernier_scoring.score} · ρc {Math.round(data.dernier_scoring.rho * 100)}%
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
