'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { MyDecisionItem } from '@/lib/types';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { DecisionsTable } from '@/components/rep/DecisionsTable';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

type Periode = '7j' | '30j' | '90j' | 'all';

const PERIODE_LABELS: Record<Periode, string> = {
  '7j': '7 jours', '30j': '30 jours', '90j': '90 jours', 'all': 'Tout',
};

export default function RepPage() {
  const [periode, setPeriode]     = useState<Periode>('30j');
  const [decisions, setDecisions] = useState<MyDecisionItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState<string | null>(null);

  const load = useCallback(async (p: Periode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await decisionsRepository.getMyDecisions(p, 50);
      setDecisions(res.decisions);
    } catch {
      setError('Impossible de charger vos rapports. Vérifiez que le backend tourne sur le port 8080.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(periode); }, [periode, load]);

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Mes rapports PDF
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Décisions que vous avez produites
            </p>
          </div>
        </div>

        {/* Sélecteur période */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(Object.keys(PERIODE_LABELS) as Periode[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                periode === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {PERIODE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement de vos rapports…</span>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={() => load(periode)} /></Card>
      )}

      {/* ── Table ── */}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {decisions.length} décision{decisions.length > 1 ? 's' : ''} sur {PERIODE_LABELS[periode].toLowerCase()}
          </p>
          <DecisionsTable decisions={decisions} />
        </>
      )}
    </div>
  );
}
