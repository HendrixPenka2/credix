'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, BarChart2 } from 'lucide-react';
import { ScoreDistribution, Thresholds } from '@/lib/types';
import { dashboardRepository } from '@/lib/repositories/dashboard.repository';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { ScoreDistributionChart } from '@/components/superviseur/ScoreDistributionChart';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

type Periode = '7j' | '30j' | '90j';
const PERIODE_LABELS: Record<Periode, string> = {
  '7j': '7 jours', '30j': '30 jours', '90j': '90 jours',
};

const ZONE_CLS: Record<string, string> = {
  emerald: 'border-emerald-200 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-400',
  amber:   'border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400',
  rose:    'border-rose-200 dark:border-rose-700/30 text-rose-700 dark:text-rose-400',
};

export default function DistributionPage() {
  const [periode, setPeriode] = useState<Periode>('30j');
  const [dist, setDist]       = useState<ScoreDistribution | null>(null);
  const [seuils, setSeuils]   = useState<Thresholds>({ refuse: 500, accorde: 600 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (p: Periode) => {
    setLoading(true); setError(null);
    try {
      const [d, th] = await Promise.all([
        dashboardRepository.getScoreDistribution(p),
        adminRepository.getThresholds().catch(() => ({ refuse: 500, accorde: 600 })),
      ]);
      setDist(d); setSeuils(th as Thresholds);
    } catch {
      setError('Impossible de charger la distribution. Vérifiez que le backend tourne sur le port 8080.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(periode); }, [periode, load]);

  const data = dist?.distribution?.filter(d => typeof d._id === 'number') ?? [];
  const total = data.reduce((s, d) => s + d.count, 0);
  const nbAccord = data.filter(d => (d._id as number) >= seuils.accorde).reduce((s, d) => s + d.count, 0);
  const nbRefus  = data.filter(d => (d._id as number) + 50 <= seuils.refuse).reduce((s, d) => s + d.count, 0);
  const nbRevue  = total - nbAccord - nbRefus;

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Distribution des scores</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Répartition du portefeuille par tranche PDO</p>
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

      {!loading && !error && dist && (
        <>
          {/* Mini KPIs par zone */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Zone accord', value: nbAccord, pct: total ? Math.round(nbAccord/total*100) : 0, color: 'emerald' },
              { label: 'Zone revue',  value: nbRevue,  pct: total ? Math.round(nbRevue/total*100)  : 0, color: 'amber'   },
              { label: 'Zone refus',  value: nbRefus,  pct: total ? Math.round(nbRefus/total*100)  : 0, color: 'rose'    },
            ].map(({ label, value, pct, color }) => (
              <Card key={label} className={cn('p-5', ZONE_CLS[color])}>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-3xl font-semibold mt-1">{value}</p>
                <p className="text-sm opacity-80">{pct}% du portefeuille</p>
              </Card>
            ))}
          </div>

          <ScoreDistributionChart distribution={dist} seuilRefus={seuils.refuse} seuilAccord={seuils.accorde} />

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Seuils PDO actifs : refus &lt; {seuils.refuse} · accord ≥ {seuils.accorde} · configurables par l'admin
          </p>
        </>
      )}
    </div>
  );
}
