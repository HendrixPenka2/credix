'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Target, Inbox } from 'lucide-react';
import { ScoreBands } from '@/lib/types';
import { dashboardRepository } from '@/lib/repositories/dashboard.repository';
import { ScoreBandsTable } from '@/components/superviseur/ScoreBandsTable';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

type Periode = '7j' | '30j' | '90j';
const PERIODE_LABELS: Record<Periode, string> = {
  '7j': '7 jours', '30j': '30 jours', '90j': '90 jours',
};

export default function TranchesPage() {
  const [periode, setPeriode] = useState<Periode>('30j');
  const [bands, setBands]     = useState<ScoreBands | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (p: Periode) => {
    setLoading(true); setError(null);
    try {
      const b = await dashboardRepository.getScoreBands(p);
      setBands(b);
    } catch {
      setError('Impossible de charger les tranches. Vérifiez que le backend tourne sur le port 8080.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(periode); }, [periode, load]);

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <Target className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Tranches de risque</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Analyse du portefeuille par bandes de score PDO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(Object.keys(PERIODE_LABELS) as Periode[]).map(p => (
            <button key={p} onClick={() => setPeriode(p)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                periode === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}>{PERIODE_LABELS[p]}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={() => load(periode)} /></Card>
      )}

      {!loading && !error && bands && (
        <>
          {bands.total_dossiers === 0 ? (
            <Card><EmptyState icon={Inbox} title="Aucun dossier sur cette période" /></Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total dossiers" value={bands.total_dossiers} hint={`sur ${PERIODE_LABELS[periode].toLowerCase()}`} />
                <StatCard label="Seuil refus" value={`< ${bands.seuils_pdo.refuse}`} hint="configurable par l'admin" tone="danger" />
                <StatCard label="Seuil accord" value={`≥ ${bands.seuils_pdo.accorde}`} hint="configurable par l'admin" tone="success" />
              </div>

              <ScoreBandsTable bands={bands} />

              <p className="text-[10px] text-slate-400 dark:text-slate-500">{bands.note_calibration}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
