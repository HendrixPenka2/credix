'use client';

import { useRouter } from 'next/navigation';
import {
  Zap, ArrowRight, TrendingUp, TrendingDown,
  Minus, FlaskConical, Calendar,
} from 'lucide-react';
import { SimulationResult, LastScore } from '@/lib/types';
import { ShapBar, ScoreGauge } from '@/components/Charts';
import { DecisionBadge, Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPd, formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Props {
  result: SimulationResult;
  lastScore?: LastScore;
  clientId: string;
  onReset?: () => void;
}

// ── Delta badge ────────────────────────────────────────────────────────────────
function DeltaBadge({
  a, b, higherIsBetter = true, unit = '',
}: {
  a: number;
  b: number;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  const delta = a - b;
  const neutral = Math.abs(delta) < 0.5;
  const isGood  = higherIsBetter ? delta > 0 : delta < 0;

  if (neutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
        <Minus className="w-3 h-3" />stable
      </span>
    );
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-bold',
      isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    )}>
      {isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {delta > 0 ? '+' : ''}{Math.round(delta)}{unit}
    </span>
  );
}

// ── Carte score ─────────────────────────────────────────────────────────────────
function ScoreCard({
  title, badge, score, decision, pd, rho, date, isSimul = false,
}: {
  title: string;
  badge?: React.ReactNode;
  score: number;
  decision: string;
  pd: number;
  rho?: number;
  date?: string;
  isSimul?: boolean;
}) {
  const rhoStyle = rho != null ? getRhoStyle(rho) : null;
  return (
    <Card className={cn(
      'p-6 flex flex-col gap-4',
      isSimul && 'border-amber-200 dark:border-amber-700/40 ring-1 ring-amber-200/50 dark:ring-amber-700/20'
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{title}</p>
        {badge}
      </div>
      <ScoreGauge score={score} />
      <div className="flex justify-center">
        <DecisionBadge decision={decision} />
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">Score</p>
          <p className="text-sm font-semibold font-mono text-slate-900 dark:text-white">{score}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">PD</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatPd(pd)}</p>
        </div>
        {rho != null && rhoStyle && (
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">ρc</p>
            <p className={cn('text-sm font-semibold', rhoStyle.text)}>{formatRho(rho)}</p>
          </div>
        )}
      </div>
      {date && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 justify-center">
          <Calendar className="w-3 h-3" />
          {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      )}
    </Card>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export function SimulResultDisplay({ result, lastScore, clientId, onReset }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-5">

      {/* ── Comparaison côte à côte ── */}
      <div className="grid grid-cols-[1fr_80px_1fr] items-stretch gap-3">

        {/* Colonne simulée */}
        <ScoreCard
          title="Score simulé"
          badge={
            <Badge tone="warning" className="gap-1">
              <FlaskConical className="w-2.5 h-2.5" />Simulé
            </Badge>
          }
          score={result.score_pdo}
          decision={result.decision}
          pd={result.pd_c}
          rho={result.rho_c}
          isSimul
        />

        {/* Colonne delta */}
        <div className="flex flex-col items-center justify-center gap-4 py-6">
          <ArrowRight className="w-5 h-5 text-slate-200 dark:text-slate-700" />
          {lastScore && (
            <>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Score</span>
                <DeltaBadge a={result.score_pdo} b={lastScore.score_pdo} higherIsBetter />
              </div>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">PD</span>
                <DeltaBadge
                  a={result.pd_c * 100}
                  b={lastScore.pd_c * 100}
                  higherIsBetter={false}
                  unit="%"
                />
              </div>
            </>
          )}
        </div>

        {/* Colonne réel ou placeholder */}
        {lastScore ? (
          <ScoreCard
            title="Dernier scoring réel"
            score={lastScore.score_pdo}
            decision={lastScore.decision}
            pd={lastScore.pd_c}
            date={lastScore.date}
          />
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-center p-6 min-h-[300px]">
            <FlaskConical className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Aucun scoring réel</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[14ch]">
                Premier dossier — pas de comparaison disponible
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── SHAP Top 3 ── */}
      {(result.shap_top3?.length ?? 0) > 0 && (
        <Card className="p-6 space-y-4">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Facteurs principaux du scénario simulé
          </p>
          <div className="space-y-1">
            {result.shap_top3.map((s, i) => (
              <ShapBar
                key={i}
                label={s.libelle_agent ?? s.feature}
                shap_value={s.shap_value}
                poids_pct={s.poids_pct}
                explication_naturelle={s.explication_naturelle}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
            Simulation non enregistrée — résultat indicatif uniquement.
          </p>
        </Card>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <Button className="flex-1" size="lg" onClick={() => router.push(`/score?client_id=${clientId}`)}>
          <Zap className="w-4 h-4" />Lancer le vrai scoring
        </Button>
        {onReset && (
          <Button variant="outline" size="lg" onClick={onReset}>
            Nouvelle simulation
          </Button>
        )}
      </div>
    </div>
  );
}
