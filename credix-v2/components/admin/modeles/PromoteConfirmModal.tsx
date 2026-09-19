"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Banner } from "@/components/shared/Banner";
import { monitoringRepository } from "@/lib/repositories/monitoring.repository";
import { nomVersion } from "@/components/superviseur/modele/ModelVersionsTable";
import type { ModelVersion } from "@/lib/types";

function MetricRow({ label, current, candidate }: { label: string; current?: number; candidate?: number }) {
  const improved = current != null && candidate != null && candidate > current;
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline-variant/40 last:border-0">
      <span className="font-body-sm text-on-surface-variant">{label}</span>
      <span className="flex items-center gap-1 font-mono text-on-surface">
        {candidate?.toFixed(3) ?? "—"}
        {improved && <Icon name="arrow_upward" size={14} className="text-success-emerald" />}
      </span>
    </div>
  );
}

export function PromoteConfirmModal({
  candidate,
  current,
  onOpenChange,
  onPromoted,
}: {
  candidate: ModelVersion | null;
  current?: ModelVersion;
  onOpenChange: (open: boolean) => void;
  onPromoted: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!candidate) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await monitoringRepository.promoteModel(candidate!.run_id);
      onPromoted();
      onOpenChange(false);
      setConfirmed(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de promouvoir cette version.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger-rose">
            <Icon name="rocket_launch" filled />
            Promouvoir en production
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Banner
            variant="warning"
            title="Action critique"
            description="Cette action est immédiate et irréversible. L'ancienne version en production sera archivée et remplacée pour tous les scorings à venir."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-outline-variant/60 p-4">
              <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Production actuelle</p>
              <p className="font-data-sm text-on-surface mb-2">{current ? nomVersion(current) : "Aucune"}</p>
              <MetricRow label="AUC" current={undefined} candidate={current?.metriques?.auc} />
              <MetricRow label="Gini" current={undefined} candidate={current?.metriques?.gini} />
              <MetricRow label="KS" current={undefined} candidate={current?.metriques?.ks} />
            </div>
            <div className="rounded-lg border border-secondary/40 bg-secondary/5 p-4">
              <p className="font-label-md text-secondary uppercase tracking-wider mb-2">Candidat</p>
              <p className="font-data-sm text-on-surface mb-2">{nomVersion(candidate)}</p>
              <MetricRow label="AUC" current={current?.metriques?.auc} candidate={candidate.metriques?.auc} />
              <MetricRow label="Gini" current={current?.metriques?.gini} candidate={candidate.metriques?.gini} />
              <MetricRow label="KS" current={current?.metriques?.ks} candidate={candidate.metriques?.ks} />
            </div>
          </div>

          {candidate.description && (
            <div>
              <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Description des changements</p>
              <pre className="font-mono text-xs bg-surface-container-low rounded-lg p-3 whitespace-pre-wrap">{candidate.description}</pre>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox tone="danger" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
            <span className="font-body-sm text-on-surface-variant">
              Je comprends que cette action est immédiate et irréversible, et qu&apos;elle affectera tous les scorings à venir.
            </span>
          </label>

          {error && <Banner variant="critical" title="Erreur" description={error} />}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={!confirmed} loading={submitting} onClick={handleConfirm}>
            <Icon name="publish" size={16} />
            Confirmer la mise en production
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
