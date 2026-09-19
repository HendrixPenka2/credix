"use client";

import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RhoBadge } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import type { DecisionPendingReview } from "@/lib/types";

export function UrgentQueue({ dossiers }: { dossiers: DecisionPendingReview[] }) {
  const router = useRouter();
  const urgent = [...dossiers].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(0, 3);

  return (
    <Card className="p-card-padding">
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Dossiers les plus urgents</CardTitle>
        <button className="font-body-sm text-secondary hover:underline" onClick={() => router.push("/superviseur/revue")}>
          Voir la file
        </button>
      </div>
      {urgent.length === 0 ? (
        <EmptyState icon="task_alt" title="File vide" description="Aucun dossier en attente." />
      ) : (
        <div className="space-y-2">
          {urgent.map((d) => (
            <button
              key={d.demande_id}
              onClick={() => router.push("/superviseur/revue")}
              className="flex w-full items-center justify-between p-3 rounded-lg border border-outline-variant/60 hover:border-outline transition-colors text-left"
            >
              <div>
                <p className="font-data-sm text-on-surface">
                  {d.client_prenom} {d.client_nom}
                </p>
                <p className="font-body-sm text-on-surface-variant">{formatDateTime(d.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.is_anomaly && <Badge tone="warning">Interceptée</Badge>}
                <RhoBadge rho={d.rho_c} />
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
