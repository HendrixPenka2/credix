'use client';

import Link from 'next/link';
import { Activity, Zap, ShieldAlert } from 'lucide-react';
import { Client } from '@/lib/types';
import { formatRho, formatPd, formatDateTime, decisionLabel } from '@/lib/utils';
import { ScoreGauge, CoverageRing } from '@/components/Charts';
import { DecisionBadge } from '@/components/ui/badge';
import { HistoryItem, getDecisionVal, decisionCls } from '@/components/client/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  client: Client;
  latestDecision?: HistoryItem;
}

function MetricCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <Card className={cn('p-4 flex flex-col gap-0.5', highlight && 'border-amber-300 dark:border-amber-600/50 ring-1 ring-amber-200 dark:ring-amber-700/30')}>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
      <span className={cn('text-2xl font-semibold', highlight ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white')}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>}
    </Card>
  );
}

function Step({ num, label, children, active }: { num: number; label: string; children: React.ReactNode; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
        active ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      )}>
        {num}
      </div>
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide whitespace-nowrap">
        {label}
      </span>
      {children}
    </div>
  );
}

function StepConnector() {
  return (
    <div className="flex-1 flex items-start pt-3">
      <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mt-0" />
    </div>
  );
}

/** Card pleine — uniquement quand le score a réellement été intercepté (ACCORDÉ → REVUE) */
function IFEscaladeCard({ d }: { d: HistoryItem }) {
  const decisionInitiale = getDecisionVal(d.decision_avant_if ?? d.decision_initiale) || 'ACCORDE';
  const anomalyScore     = d.anomaly_score;
  const ifSeuil          = d.if_seuil;

  return (
    <Card className="overflow-hidden">
      <div className="flex border-l-4 border-amber-400 dark:border-amber-500">
        <div className="flex-1 px-5 py-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Profil atypique détecté — Dossier intercepté
              </span>
            </div>
            <span className="shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40">
              Revue forcée
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Le score recommandait un accord. L'analyse de profil a détecté un comportement
            statistiquement atypique et a forcé ce dossier en revue manuelle.
          </p>

          <div className="flex items-start gap-2">
            <Step num={1} label="Score IA">
              <span className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border', decisionCls(decisionInitiale))}>
                {decisionLabel(decisionInitiale)}
              </span>
            </Step>

            <StepConnector />

            <Step num={2} label="Analyse de profil" active>
              <div className="text-center">
                <span className="block text-xs font-semibold text-amber-700 dark:text-amber-400">Anomalie</span>
                {anomalyScore != null && (
                  <span className="block text-[11px] font-mono text-amber-600 dark:text-amber-500 mt-0.5">
                    {anomalyScore.toFixed(4)}
                    {ifSeuil != null && (
                      <span className="text-slate-400 dark:text-slate-500"> › {ifSeuil.toFixed(4)}</span>
                    )}
                  </span>
                )}
              </div>
            </Step>

            <StepConnector />

            <Step num={3} label="Décision finale">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600/40">
                EN REVUE
              </span>
            </Step>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Bandeau léger — anomalie détectée mais SANS interception (score déjà en revue) */
function AnomalyNote({ d }: { d: HistoryItem }) {
  if (d.anomaly_score == null) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Profil atypique détecté</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
          L'analyse de profil a signalé ce dossier comme statistiquement atypique.
        </p>
      </div>
      <span className="text-xs font-mono text-amber-700 dark:text-amber-400 shrink-0">
        {d.anomaly_score.toFixed(4)}
      </span>
    </div>
  );
}

export function ScoreTab({ client, latestDecision }: Props) {
  const { last_score, coverage, client_id } = client;
  const rho        = coverage?.rho ?? 0;
  const ifEscalade = latestDecision?.if_escalade === true;
  const isAnomalous = latestDecision?.is_anomaly === true;
  const showAnomalyStat = latestDecision?.anomaly_score != null;

  if (!last_score) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Aucun scoring réalisé</p>
          <Button asChild size="sm">
            <Link href={`/score?client_id=${client_id}`}><Zap className="w-3.5 h-3.5" />Lancer le premier scoring</Link>
          </Button>
        </Card>
        <Card className="lg:col-span-2 p-6 flex items-center gap-6">
          <CoverageRing rho={rho} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rho === 0 ? 'ρc sera calculé lors du premier scoring.' : `Couverture actuelle : ${formatRho(rho)}`}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {ifEscalade && latestDecision && <IFEscaladeCard d={latestDecision} />}
      {!ifEscalade && isAnomalous && latestDecision && <AnomalyNote d={latestDecision} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <Card className="lg:col-span-1 p-6 flex flex-col items-center gap-3">
          <ScoreGauge score={last_score.score_pdo} />
          <DecisionBadge decision={last_score.decision} />
          <div className="text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Probabilité de défaut</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatPd(last_score.pd_c)}</p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(last_score.date)}</p>
        </Card>

        <div className="lg:col-span-2 space-y-4">

          <Card className="p-5 flex items-center gap-6">
            <CoverageRing rho={rho} />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {rho < 0.25 ? 'Dossier très incomplet' : rho < 0.40 ? 'Couverture partielle' : 'Couverture suffisante'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {coverage?.sources_disponibles?.length ?? 0} source(s) · {coverage?.sources_manquantes?.length ?? 0} manquante(s)
              </p>
            </div>
          </Card>

          <div className={cn('grid gap-3', showAnomalyStat ? 'grid-cols-4' : 'grid-cols-3')}>
            <MetricCard label="Score PDO" value={last_score.score_pdo} sub="sur 850" />
            <MetricCard label="PD" value={formatPd(last_score.pd_c)} sub="probabilité défaut" />
            <MetricCard label="ρc" value={formatRho(rho)} sub="couverture" />
            {showAnomalyStat && (
              <MetricCard
                label="Score d'anomalie"
                value={latestDecision!.anomaly_score!.toFixed(4)}
                sub="analyse de profil"
                highlight
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
