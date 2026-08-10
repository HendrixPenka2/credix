'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Layers, AlertTriangle, AlertOctagon } from 'lucide-react';
import { PortfolioRisk, AnomalyStatistics, OverrideStats, ScoreDistribution, DecisionPendingReview } from '@/lib/types';
import { dashboardRepository } from '@/lib/repositories/dashboard.repository';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { PortfolioStats } from '@/components/superviseur/PortfolioStats';
import { SecondaryKpis } from '@/components/superviseur/SecondaryKpis';
import { UrgenceQueue } from '@/components/superviseur/UrgenceQueue';
import { ModelHealth } from '@/components/superviseur/ModelHealth';
import { PortfolioStackedBar } from '@/components/superviseur/PortfolioStackedBar';
import { VolumeChart } from '@/components/dashboard/VolumeChart';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Periode = '7j' | '30j' | '90j';
const PERIODE_LABELS: Record<Periode, string> = {
  '7j': '7 jours', '30j': '30 jours', '90j': '90 jours',
};
const ALERTE_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof AlertTriangle; tone: 'danger' | 'warning' }> = {
  'CRITIQUE':  { bg: 'bg-rose-50 dark:bg-rose-900/20',   border: 'border-rose-300/60 dark:border-rose-700/30',   text: 'text-rose-700 dark:text-rose-400',   icon: AlertOctagon,  tone: 'danger' },
  'ÉLEVÉ':     { bg: 'bg-rose-50 dark:bg-rose-900/20',   border: 'border-rose-200/60 dark:border-rose-700/30',   text: 'text-rose-600 dark:text-rose-400',   icon: AlertTriangle, tone: 'danger' },
  'ATTENTION': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200/60 dark:border-amber-700/30', text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle, tone: 'warning' },
};

export default function SuperviseurDashboard() {
  const [periode, setPeriode]       = useState<Periode>('30j');
  const [risk, setRisk]             = useState<PortfolioRisk | null>(null);
  const [dist, setDist]             = useState<ScoreDistribution | null>(null);
  const [anomaly, setAnomaly]       = useState<AnomalyStatistics | null>(null);
  const [overrideStats, setOvStats] = useState<OverrideStats | null>(null);
  const [pending, setPending]       = useState<DecisionPendingReview[]>([]);
  const [drift, setDrift]           = useState<any>(null);
  const [versions, setVersions]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async (p: Periode) => {
    setLoading(true); setError(null);
    try {
      const [r, d, a, ov, pend] = await Promise.all([
        dashboardRepository.getPortfolioRisk(p),
        dashboardRepository.getScoreDistribution(p),
        dashboardRepository.getAnomalyStatistics(p),
        decisionsRepository.getOverrideStats(),
        decisionsRepository.getPendingReviews(),
      ]);
      setRisk(r); setDist(d); setAnomaly(a); setOvStats(ov);
      setPending(pend.dossiers ?? []);

      // Monitoring — silencieux si l'endpoint n'est pas encore dispo
      try {
        const [dr, vers] = await Promise.all([
          monitoringRepository.getModelDrift(),
          monitoringRepository.getModelVersions(),
        ]);
        setDrift(dr);
        setVersions((vers as any)?.versions ?? []);
      } catch { /* monitoring optionnel */ }
    } catch {
      setError('Impossible de charger le tableau de bord. Vérifiez que le backend tourne sur le port 8080.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(periode); }, [periode, load]);

  const alerteStyle = risk?.niveau_alerte ? ALERTE_STYLES[risk.niveau_alerte] : null;

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <Layers className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Vue d'ensemble</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Tableau de bord superviseur — pilotage du risque</p>
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
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement du tableau de bord…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={() => load(periode)} /></Card>
      )}

      {!loading && !error && risk && (
        <>
          {/* Bannière alerte */}
          {risk.alerte && alerteStyle && (
            <div className={cn('flex items-start gap-3 px-5 py-4 rounded-xl border', alerteStyle.bg, alerteStyle.border)}>
              <alerteStyle.icon className={cn('w-5 h-5 shrink-0 mt-0.5', alerteStyle.text)} />
              <div>
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-semibold', alerteStyle.text)}>Alerte portefeuille</p>
                  <Badge tone={alerteStyle.tone}>{risk.niveau_alerte}</Badge>
                </div>
                <p className={cn('text-xs mt-0.5 opacity-90', alerteStyle.text)}>{risk.alerte}</p>
              </div>
            </div>
          )}

          {/* KPI portefeuille */}
          <PortfolioStats risk={risk} enAttente={pending.length} />

          {/* KPI secondaires superviseur */}
          <SecondaryKpis risk={risk} anomaly={anomaly} overrideStats={overrideStats} />

          {/* Distribution + File d'urgence */}
          <div className="grid grid-cols-3 gap-5 items-start">
            <div className="col-span-2">
              {dist && <VolumeChart distribution={dist} />}
            </div>
            <div className="col-span-1">
              <UrgenceQueue dossiers={pending} />
            </div>
          </div>

          {/* Barre empilée + Santé modèle */}
          <div className="grid grid-cols-2 gap-5 items-start">
            <PortfolioStackedBar risk={risk} />
            <ModelHealth drift={drift} versions={versions} />
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Seuils appliqués — bannière thin-file : ρc &lt; {risk.seuils_appliques?.rho_banniere} ·
            critique : ρc &lt; {risk.seuils_appliques?.rho_critique}
          </p>
        </>
      )}
    </div>
  );
}
