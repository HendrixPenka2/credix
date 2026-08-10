'use client';

import { TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ScoreProgression } from '@/lib/types';
import { formatRho } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface Props {
  progression: ScoreProgression | null;
  loading: boolean;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-xl font-semibold text-slate-900 dark:text-white">{value}</span>
      {sub && <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>}
    </div>
  );
}

export function ProgressionTab({ progression, loading }: Props) {
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm text-slate-400 dark:text-slate-500">Chargement de la progression...</span>
      </Card>
    );
  }

  if (!progression || progression.nb_scorings < 2) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {!progression || progression.nb_scorings === 0
            ? 'Aucun scoring réalisé.'
            : 'Au moins 2 scorings requis pour afficher la progression.'}
        </p>
      </Card>
    );
  }

  const chartData = progression.historique?.map(h => ({
    date: new Date(h.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    score: h.score_pdo,
    rho: Math.round(h.rho_c * 100),
    pd: parseFloat((h.pd_c * 100).toFixed(2)),
  })) ?? [];

  const deltaScore = progression.delta_score;
  const deltaRho   = progression.delta_rho;

  return (
    <div className="space-y-5">

      {/* ── Cartes résumé ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Scorings" value={progression.nb_scorings} sub="au total" />
        <StatCard
          label="Évolution score"
          value={deltaScore > 0 ? `+${deltaScore}` : deltaScore}
          sub={progression.tendance_score}
        />
        <StatCard
          label="Évolution ρc"
          value={deltaRho > 0 ? `+${formatRho(deltaRho)}` : formatRho(deltaRho)}
          sub={progression.tendance_rho}
        />
        <StatCard
          label="Dernier score"
          value={progression.dernier_scoring?.score ?? '—'}
          sub={progression.dernier_scoring
            ? new Date(progression.dernier_scoring.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            : ''}
        />
      </div>

      {/* ── Graphique Score PDO ── */}
      <Card className="p-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
          Évolution du Score PDO
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[300, 850]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, 'Score PDO']} />
            <ReferenceLine y={600} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Accordé ≥600', fontSize: 10, fill: '#10b981' }} />
            <ReferenceLine y={500} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Refus <500', fontSize: 10, fill: '#f59e0b' }} />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Score PDO" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Graphique ρc ── */}
      <Card className="p-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
          Évolution de la Couverture ρc
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}%`, 'ρc']} />
            <ReferenceLine y={40} stroke="#10b981" strokeDasharray="4 4" label={{ value: '40%', fontSize: 10, fill: '#10b981' }} />
            <ReferenceLine y={25} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '25%', fontSize: 10, fill: '#f43f5e' }} />
            <Line type="monotone" dataKey="rho" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} name="ρc (%)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {progression.resume && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
          {progression.resume}
        </div>
      )}
    </div>
  );
}