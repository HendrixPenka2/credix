'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { DecisionPendingReview } from '@/lib/types';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { RevueList } from '@/components/superviseur/RevueList';
import { RevueDetail } from '@/components/superviseur/RevueDetail';
import { OverrideForm } from '@/components/superviseur/OverrideForm';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

export default function RevuePage() {
  const { toast } = useToast();
  const [dossiers, setDossiers]     = useState<DecisionPendingReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await decisionsRepository.getPendingReviews();
      setDossiers(res.dossiers);
      setSelectedId(prev => prev ?? res.dossiers[0]?.demande_id ?? null);
    } catch {
      setError('Impossible de charger la file de revue. Vérifiez que le backend tourne sur le port 8080.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = dossiers.find(d => d.demande_id === selectedId) ?? null;

  const handleOverride = async (decision: 'ACCORDE' | 'REFUSE', commentaire: string) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await decisionsRepository.overrideDecision(selected.demande_id, decision, commentaire);
      const remaining = dossiers.filter(d => d.demande_id !== selected.demande_id);
      setDossiers(remaining);
      setSelectedId(remaining[0]?.demande_id ?? null);
      toast({ variant: 'success', title: `Dossier ${decision === 'ACCORDE' ? 'accordé' : 'refusé'} avec succès` });
    } catch (err) {
      toast({ variant: 'error', title: 'Erreur lors de la validation' });
      throw err; // laisse OverrideForm afficher le détail (409/400)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Dossiers en revue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dossiers en attente de votre décision
          </p>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement de la file de revue…</span>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && dossiers.length === 0 && (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="Aucun dossier en attente"
            description="Tous les dossiers ont été traités."
          />
        </Card>
      )}

      {/* ── Contenu ── */}
      {!loading && !error && dossiers.length > 0 && (
        <div className="grid grid-cols-3 gap-5 items-start">
          <div className="col-span-1">
            <RevueList dossiers={dossiers} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="col-span-2 space-y-5">
            {selected && (
              <>
                <RevueDetail dossier={selected} />
                <OverrideForm onSubmit={handleOverride} loading={submitting} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
