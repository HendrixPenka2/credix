'use client';

import { useState, Suspense } from 'react';
import { Loader2, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Client } from '@/lib/types';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { ClientSelector } from '@/components/scoring/ClientSelector';
import { HistCharts } from '@/components/hist/HistCharts';
import { HistTable } from '@/components/hist/HistTable';
import { HistoryItem } from '@/components/client/types';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

function HistPage() {
  const [client,  setClient]  = useState<Client | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleClientSelect = async (c: Client) => {
    setClient(c);
    setLoading(true);
    setError(null);
    try {
      const res = await scoringRepository.getScoringHistory(c.client_id, 50);
      setHistory((res as any).historique ?? []);
    } catch {
      setError("Impossible de charger l'historique de ce client.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => client && handleClientSelect(client);

  const hasHistory = history.length > 0;

  // ── Mini-stats ──────────────────────────────────────────────────────────────
  const avgScore   = hasHistory ? Math.round(history.reduce((s, h) => s + h.score_pdo, 0) / history.length) : 0;
  const lastScore  = hasHistory ? history[history.length - 1].score_pdo : 0;
  const firstScore = hasHistory ? history[0].score_pdo : 0;
  const delta      = hasHistory && history.length >= 2 ? lastScore - firstScore : null;

  const DeltaIcon = delta == null ? Minus
    : delta > 0 ? TrendingUp
    : delta < 0 ? TrendingDown
    : Minus;

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/40 flex items-center justify-center shrink-0">
          <History className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Historique de scoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Évolution des scores et décisions dans le temps
          </p>
        </div>
      </div>

      {/* ── Sélecteur client ── */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Sélectionner un client</h2>
        <ClientSelector onSelect={handleClientSelect} />
      </Card>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement de l'historique…</span>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={retry} /></Card>
      )}

      {/* ── Mini-stats ── */}
      {!loading && hasHistory && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Scorings" value={history.length} icon={History} tone="brand" hint="au total" />
          <StatCard label="Score moyen" value={avgScore} tone="neutral" hint="sur la période" />
          <StatCard label="Score actuel" value={lastScore} tone="brand" hint="dernier scoring" />
          <StatCard
            label="Évolution"
            value={
              <span className="inline-flex items-center gap-1.5">
                <DeltaIcon className="w-5 h-5" />
                {delta != null ? `${delta > 0 ? '+' : ''}${delta} pts` : '—'}
              </span>
            }
            tone={delta == null || delta === 0 ? 'neutral' : delta > 0 ? 'success' : 'danger'}
            hint="depuis le début"
          />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && client && !hasHistory && !error && (
        <Card>
          <EmptyState
            icon={History}
            title="Aucun scoring pour ce client"
            description={'Lancez un scoring depuis la page "Nouveau scoring" pour démarrer l\'historique'}
          />
        </Card>
      )}

      {/* ── Charts + Table ── */}
      {!loading && hasHistory && (
        <>
          <HistCharts history={history} />
          <HistTable history={history} />
        </>
      )}
    </div>
  );
}

export default function HistPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    }>
      <HistPage />
    </Suspense>
  );
}
