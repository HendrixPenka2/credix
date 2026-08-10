// DESTINATION: components/superviseur/PortfolioStackedBar.tsx
'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { PortfolioRisk } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface Props { risk: PortfolioRisk; }

const TICK = { fill: '#94a3b8', fontSize: 11 };

function StackedTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs space-y-1">
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          <strong>{p.value}</strong> {p.name}
        </p>
      ))}
    </div>
  );
}

export function PortfolioStackedBar({ risk }: Props) {
  const accorde = risk.distribution?.['ACCORDE'] ?? 0;
  const revue   = risk.distribution?.['REVUE_MANUELLE'] ?? 0;
  const refuse  = risk.distribution?.['REFUSE'] ?? 0;
  const total   = accorde + revue + refuse;

  const data = [{ name: risk.periode, ACCORDE: accorde, REVUE_MANUELLE: revue, REFUSE: refuse }];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Répartition des décisions du portefeuille
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{total} dossier{total > 1 ? 's' : ''}</p>
      </div>

      {total === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic">
          Aucun dossier sur cette période.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={TICK} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Legend
              formatter={(v) => v === 'ACCORDE' ? 'Accordés' : v === 'REVUE_MANUELLE' ? 'En revue' : 'Refusés'}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="ACCORDE" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} barSize={48} />
            <Bar dataKey="REVUE_MANUELLE" stackId="a" fill="#f59e0b" barSize={48} />
            <Bar dataKey="REFUSE" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}