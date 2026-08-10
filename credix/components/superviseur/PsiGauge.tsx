'use client';

import { Card } from '@/components/ui/card';
import { PsiBadge } from '@/components/ui/badge';

interface Props { psi: number | null; statut: string; }

const ZONES = [
  { max: 0.10, color: '#10b981', label: 'STABLE',    desc: '< 0.10' },
  { max: 0.25, color: '#f59e0b', label: 'ATTENTION', desc: '0.10 – 0.25' },
  { max: 1.00, color: '#f43f5e', label: 'DÉRIVE',    desc: '≥ 0.25' },
];

export function PsiGauge({ psi, statut }: Props) {
  const MAX_DISPLAY = 0.50;
  const pct = psi != null ? Math.min(psi / MAX_DISPLAY * 100, 100) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Indice de dérive globale (PSI)
        </p>
        <PsiBadge statut={statut} />
      </div>

      {/* Valeur PSI */}
      <div className="text-center mb-6">
        <p className="text-5xl font-semibold font-mono text-slate-900 dark:text-white">
          {psi != null ? psi.toFixed(4) : '—'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Population Stability Index</p>
      </div>

      {/* Barre PSI colorée */}
      <div className="space-y-2 mb-5">
        <div className="h-4 rounded-full overflow-hidden flex">
          <div className="flex-1" style={{ background: '#10b981' }} />
          <div className="flex-1" style={{ background: '#f59e0b' }} />
          <div className="flex-1" style={{ background: '#f43f5e' }} />
        </div>
        {/* Curseur */}
        <div className="relative h-2">
          {psi != null && (
            <div className="absolute top-0 w-3 h-3 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-900 shadow-md -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pct}%` }} />
          )}
        </div>
        {/* Labels */}
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span>0.10</span>
          <span>0.25</span>
          <span>{`≥ 0.50`}</span>
        </div>
      </div>

      {/* Légende des zones */}
      <div className="grid grid-cols-3 gap-2">
        {ZONES.map(z => (
          <div key={z.label} className="text-center">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: z.color }} />
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1">{z.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{z.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
