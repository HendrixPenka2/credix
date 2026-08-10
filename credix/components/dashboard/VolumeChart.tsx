// DESTINATION: components/dashboard/VolumeChart.tsx
'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { ScoreDistribution } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface Props { distribution: ScoreDistribution; }

// Seuils PDO par défaut (accorde=560 / refuse=490) — utilisés pour la coloration des barres
const SEUIL_ACCORDE = 560;
const SEUIL_REFUSE  = 490;

function barColor(lowerBound: number | string) {
  if (typeof lowerBound !== 'number') return '#94a3b8'; // gris — bucket "Autres"
  if (lowerBound >= SEUIL_ACCORDE) return '#10b981'; // vert — zone accord
  if (lowerBound + 50 <= SEUIL_REFUSE) return '#f43f5e'; // rouge — zone refus
  return '#f59e0b'; // amber — zone revue
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{d.label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{d.count}</p>
      <p className="text-slate-400 dark:text-slate-500">dossier{d.count > 1 ? 's' : ''}</p>
    </div>
  );
}

const TICK = { fill: '#94a3b8', fontSize: 10 };

export function VolumeChart({ distribution }: Props) {
  const data = (distribution.distribution ?? [])
    .filter(d => typeof d._id === 'number')
    .sort((a, b) => (a._id as number) - (b._id as number))
    .map(d => ({
      label: `${d._id}-${(d._id as number) + 49}`,
      bound: d._id as number,
      count: d.count,
    }));

  const empty = data.length === 0 || data.every(d => d.count === 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Volume de scorings par tranche
        </p>
        <div className="flex items-center gap-3">
          {[
            { color: '#f43f5e', label: 'Refus' },
            { color: '#f59e0b', label: 'Revue' },
            { color: '#10b981', label: 'Accord' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />{label}
            </span>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic">
          Aucun scoring sur cette période.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={TICK} interval={0} angle={-35} textAnchor="end" height={50} />
            <YAxis tick={TICK} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={barColor(d.bound)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}