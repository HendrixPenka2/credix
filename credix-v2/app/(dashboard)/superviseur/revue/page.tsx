"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton";
import { RevueFilterTabs, type RevueFilter } from "@/components/superviseur/revue/RevueFilterTabs";
import { RevueQueueList } from "@/components/superviseur/revue/RevueQueueList";
import { RevueDetail } from "@/components/superviseur/revue/RevueDetail";
import { RevueDecisionForm } from "@/components/superviseur/revue/RevueDecisionForm";
import { RevueConflictBanner } from "@/components/superviseur/revue/RevueConflictBanner";

export default function RevuePage() {
  const { data, loading, error, refetch } = useApi(useCallback(() => decisionsRepository.getPendingReviews(), []));
  const [filter, setFilter] = useState<RevueFilter>("tous");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const dossiers = data?.dossiers ?? [];
  const filtered = filter === "anomalies" ? dossiers.filter((d) => d.is_anomaly) : dossiers;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].demande_id);
    if (selectedId && !dossiers.some((d) => d.demande_id === selectedId)) {
      setSelectedId(filtered[0]?.demande_id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, dossiers, selectedId]);

  const selected = dossiers.find((d) => d.demande_id === selectedId) ?? null;

  function handleDecided() {
    setConflict(false);
    setSelectedId(null);
    refetch();
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline-lg text-on-surface">Dossiers en revue</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Traitez la file d&apos;attente, du plus ancien au plus récent.</p>
      </div>

      {loading || !data ? (
        <SkeletonCard className="h-96" />
      ) : dossiers.length === 0 ? (
        <EmptyState icon="task_alt" title="File vide" description="Aucun dossier n'est actuellement en attente de revue." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_320px] gap-6 items-start">
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden">
            <RevueFilterTabs value={filter} onChange={setFilter} totalCount={dossiers.length} anomalyCount={dossiers.filter((d) => d.is_anomaly).length} />
            <div className="mt-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <RevueQueueList dossiers={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>

          <div>{selected ? <RevueDetail dossier={selected} /> : <EmptyState icon="fact_check" title="Sélectionnez un dossier" description="Choisissez un dossier dans la liste pour afficher son détail." />}</div>

          <div className="lg:sticky lg:top-20">
            {conflict && <RevueConflictBanner onRefresh={() => { setConflict(false); refetch(); }} />}
            {selected && !conflict && (
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-card-padding">
                <RevueDecisionForm demandeId={selected.demande_id} onDecided={handleDecided} onConflict={() => setConflict(true)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
