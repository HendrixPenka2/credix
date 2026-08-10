'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { OverrideStats } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface Props { stats: OverrideStats; }

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{d.name}</p>
      <p className="text-xl font-semibold text-slate-900 dark:text-white">{d.value}</p>
    </div>
  );
}

export function OverrideDonut({ stats }: Props) {
  const data = [
    { name: 'Accordés', value: stats.overrides_accordes, color: '#10b981' },
    { name: 'Refusés',  value: stats.overrides_refuses,  color: '#f43f5e' },
  ];
  const total = stats.overrides_accordes + stats.overrides_refuses;

  if (total === 0) {
    return (
      <Card className="p-6 flex items-center justify-center h-[280px]">
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Aucune décision tranchée pour le moment.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
        Répartition de vos décisions
      </p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-semibold text-slate-900 dark:text-white">{total}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">tranchées</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5 mt-4">
        {data.map(d => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            {d.name} — {d.value}
          </span>
        ))}
      </div>
    </Card>
  );
}
