'use client';

import { useState } from 'react';
import { ModelVersion } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

interface Props {
  version: ModelVersion;
  onConfirm: (runId: string) => Promise<void>;
  onClose: () => void;
}

export function PromoteConfirmModal({ version, onConfirm, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const nom = version.version ?? version.nom_version ?? version.run_id.slice(0, 8);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(version.run_id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors de la promotion', description: detail ?? 'Impossible de promouvoir ce modèle.' });
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Promouvoir ce modèle"
      description={
        <>
          Le modèle actuellement en PRODUCTION sera archivé. Les artefacts de <strong>{nom}</strong> seront
          rechargés en mémoire et utilisés pour tous les scorings à venir. Cette action est immédiate.
          <br /><br />
          <code className="text-xs text-slate-500 dark:text-slate-400">{version.run_id}</code>
        </>
      }
      confirmLabel="Confirmer la promotion"
      loading={loading}
      onConfirm={handleConfirm}
    />
  );
}
