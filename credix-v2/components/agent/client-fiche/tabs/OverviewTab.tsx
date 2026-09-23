"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ScoreGauge } from "@/components/shared/ScoreGauge";
import { CoverageRing } from "@/components/shared/CoverageRing";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { RawFeaturesGrid } from "@/components/shared/RawFeaturesGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function OverviewTab({ client }: { client: Client }) {
  const { data, loading } = useApi(useCallback(() => scoringRepository.getScoringHistory(client.client_id, 5), [client.client_id]));

  if (loading) {
    return (
      <div className="grid lg:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const sorted = data ? [...data.historique].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
  const latest = sorted[0];

  if (!latest) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon="analytics"
          title="Aucun scoring encore réalisé"
          description="Lancez un premier scoring pour ce client depuis l'onglet « Nouveau scoring »."
        />
        <div className="flex justify-center">
          <ClientProfileModalButton client={client} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-card-padding flex flex-col items-center">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider self-start mb-2">Score PDO</p>
            <ScoreGauge score={latest.score_pdo} decision={latest.decision} size={170} />
            <DecisionBadge decision={latest.decision} className="mt-2" />
          </Card>
          <Card className="p-card-padding flex flex-col items-center">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider self-start mb-2">Couverture ρc</p>
            <CoverageRing rho={latest.rho_c} size={140} />
            <p className="font-body-sm text-on-surface-variant mt-2">Mis à jour le {formatDate(latest.timestamp)}</p>
          </Card>
        </div>

        <Card className="p-card-padding">
          <CardTitle className="mb-4">Facteurs SHAP principaux</CardTitle>
          <ShapBlock items={latest.shap_top5.slice(0, 3)} />
          <Link href={`/clients/${client.client_id}?tab=explicabilite`} className="font-body-sm text-secondary hover:underline block mt-3">
            Voir l&apos;explicabilité complète →
          </Link>
        </Card>

        <AnomalyPanel data={latest} />
      </div>

      <div className="space-y-6">
        <Card className="p-card-padding">
          <CardTitle className="mb-4">Détails du profil</CardTitle>
          <dl className="space-y-3 font-body-sm">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Date de naissance</dt>
              <dd className="text-on-surface">{formatDate(client.profile.date_naissance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Situation familiale</dt>
              <dd className="text-on-surface">{client.profile.situation_familiale ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Emploi</dt>
              <dd className="text-on-surface">{client.profile.type_emploi ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Revenu</dt>
              <dd className="text-on-surface">{client.profile.type_revenu ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Téléphone</dt>
              <dd className="text-on-surface">{client.profile.telephone ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-card-padding">
          <CardTitle className="mb-3">Scorings récents</CardTitle>
          <div className="space-y-2">
            {sorted.slice(0, 5).map((h) => (
              <div key={h.demande_id} className="flex items-center justify-between font-body-sm py-1.5 border-b border-outline-variant/40 last:border-0">
                <span className="text-on-surface-variant">{formatDateTime(h.timestamp)}</span>
                <span className="font-mono text-on-surface">{h.score_pdo}</span>
                <DecisionBadge decision={h.decision} />
              </div>
            ))}
          </div>
        </Card>

        <ClientRawDataCard client={client} />
      </div>
    </div>
  );
}

/**
 * Client sans aucun scoring : pas d'accordéon inline (rien d'autre à montrer
 * sur la page), juste un bouton ouvrant le profil complet dans une modal.
 */
function ClientProfileModalButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const nbFeatures = Object.keys(client.features ?? {}).length;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Icon name="data_object" size={18} />
        Consulter le profil complet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              Profil complet — {client.profile.prenom} {client.profile.nom}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">
              Profil déclaratif ({Object.keys(client.profile).length})
            </p>
            <RawFeaturesGrid data={client.profile} />

            <div className="border-t border-outline-variant/40 my-4" />

            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">
              Variables du modèle ({nbFeatures})
            </p>
            {nbFeatures > 0 ? (
              <RawFeaturesGrid data={client.features} />
            ) : (
              <p className="font-body-sm text-on-surface-variant italic">
                Pas encore de variables calculées — un scoring est nécessaire.
              </p>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Profil complet + variables brutes du modèle pour ce client — vue en
 * lecture seule, distincte du formulaire "Modifier le profil" qui ne montre
 * que les champs modifiables. Répond au besoin de voir toutes les infos
 * connues du client, pas seulement 4-5 champs choisis.
 */
function ClientRawDataCard({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const nbFeatures = Object.keys(client.features ?? {}).length;

  return (
    <Card className="p-card-padding">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2 font-data-sm text-on-surface">
          <Icon name="data_object" size={18} />
          Profil complet et variables brutes
        </span>
        <Icon name="expand_more" size={18} className={cn("transition-transform text-on-surface-variant", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3">
          <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Profil déclaratif ({Object.keys(client.profile).length})
          </p>
          <RawFeaturesGrid data={client.profile} />

          <div className="border-t border-outline-variant/40 my-4" />

          <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Variables du modèle ({nbFeatures})
          </p>
          {nbFeatures > 0 ? (
            <RawFeaturesGrid data={client.features} />
          ) : (
            <p className="font-body-sm text-on-surface-variant italic">
              Pas encore de variables calculées — un scoring est nécessaire.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
