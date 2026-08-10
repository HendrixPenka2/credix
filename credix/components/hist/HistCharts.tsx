'use client';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { HistoryItem, getDecisionVal } from '@/components/client/types';
import { Card } from '@/components/ui/card';

interface Props { history: HistoryItem[]; }

// ── Dots colorés par décision / par ρc ────────────────────────────────────────
function ScoreDot(props: any) {
  const { cx, cy, payload } = props;
  const fill = payload.decision === 'ACCORDE' ? '#10b981'
    : payload.decision === 'REFUSE' ? '#f43f5e' : '#f59e0b';
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={1.5} key={`sd-${cx}`} />;
}

function RhoDot(props: any) {
  const { cx, cy, payload } = props;
  const fill = payload.rho >= 40 ? '#10b981' : payload.rho >= 25 ? '#f59e0b' : '#f43f5e';
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={1.5} key={`rd-${cx}`} />;
}

// ── Tooltips custom ────────────────────────────────────────────────────────────
function ScoreTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const col = d.decision === 'ACCORDE' ? 'text-emerald-600 dark:text-emerald-400'
    : d.decision === 'REFUSE' ? 'text-rose-600 dark:text-rose-400'
    : 'text-amber-600 dark:text-amber-400';
  const label = d.decision === 'ACCORDE' ? 'ACCORDÉ' : d.decision === 'REFUSE' ? 'REFUSÉ' : 'EN REVUE';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs min-w-[110px]">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{d.date}</p>
      <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{d.score}</p>
      <p className={`font-bold mt-0.5 ${col}`}>{label}</p>
    </div>
  );
}

function RhoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const col = d.rho >= 40 ? 'text-emerald-600 dark:text-emerald-400'
    : d.rho >= 25 ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{d.date}</p>
      <p className={`text-2xl font-bold ${col}`}>ρc {d.rho}%</p>
    </div>
  );
}

const TICK  = { fill: '#94a3b8', fontSize: 11 };
const GRID  = '#e2e8f0';

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function HistCharts({ history }: Props) {
  const data = history.map((h) => ({
    date:     new Date(h.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    score:    h.score_pdo,
    rho:      Math.round(h.rho_c * 100),
    decision: getDecisionVal(h.decision),
  }));

  return (
    <div className="grid grid-cols-2 gap-5">

      {/* ── Chart Score ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Évolution du score PDO
          </p>
          <Legend items={[
            { color: '#10b981', label: 'Accordé' },
            { color: '#f59e0b', label: 'En revue' },
            { color: '#f43f5e', label: 'Refusé' },
          ]} />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis domain={[300, 850]} tick={TICK} />
            <Tooltip content={<ScoreTooltip />} />
            <ReferenceLine y={560} stroke="#10b981" strokeDasharray="4 3"
              label={{ value: '560', fill: '#10b981', fontSize: 10, position: 'insideRight' }} />
            <ReferenceLine y={490} stroke="#f43f5e" strokeDasharray="4 3"
              label={{ value: '490', fill: '#f43f5e', fontSize: 10, position: 'insideRight' }} />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5}
              dot={<ScoreDot />} activeDot={{ r: 7, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Chart ρc ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Évolution de la couverture ρc
          </p>
          <Legend items={[
            { color: '#10b981', label: '≥40%' },
            { color: '#f59e0b', label: '25-40%' },
            { color: '#f43f5e', label: '<25%' },
          ]} />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis domain={[0, 100]} tick={TICK} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<RhoTooltip />} />
            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 3"
              label={{ value: '40%', fill: '#f59e0b', fontSize: 10, position: 'insideRight' }} />
            <ReferenceLine y={25} stroke="#f43f5e" strokeDasharray="4 3"
              label={{ value: '25%', fill: '#f43f5e', fontSize: 10, position: 'insideRight' }} />
            <Line type="monotone" dataKey="rho" stroke="#8b5cf6" strokeWidth={2.5}
              dot={<RhoDot />} activeDot={{ r: 7, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}