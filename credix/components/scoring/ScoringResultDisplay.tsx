'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FlaskConical, AlertTriangle, TrendingUp, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ScoringResult } from '@/lib/types';
import { ScoreGauge, CoverageRing, ShapBar } from '@/components/Charts';
import { DecisionBadge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { formatPd, formatRho } from '@/lib/utils';
import { getRhoStyle, getAnomalyStyle } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface Props { result: ScoringResult; clientId: string; onReset?: () => void; }

export function ScoringResultDisplay({ result, clientId, onReset }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const res = await apiClient.get(`/api/decisions/${result.demande_id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `rapport-${result.demande_id}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'error', title: 'Erreur lors de la génération du PDF' });
    } finally { setPdfLoading(false); }
  };

  const rhoStyle = getRhoStyle(result.rho_c);
  const anomalyStyle = getAnomalyStyle(result.is_anomaly);

  return (
    <div className="space-y-5">

      {/* Bannière escalade — seulement si revue forcée */}
      {result.if_escalade && (
        <div className="flex items-start gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-300/60 dark:border-rose-700/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Profil atypique — Dossier transmis en revue</p>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              La recommandation initiale était <strong>{result.decision_initiale}</strong> — l'analyse de profil a signalé une anomalie et déclenché une <strong>REVUE MANUELLE</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 3 cartes principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Score PDO + Décision */}
        <Card className="p-6 flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 self-start">Score & décision</p>
          <ScoreGauge score={result.score_pdo} />
          <DecisionBadge decision={result.decision} />
          <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center">
            <div><p className="text-[11px] text-slate-400 dark:text-slate-500">PD calibrée</p><p className="text-base font-semibold text-slate-900 dark:text-white">{formatPd(result.pd_c)}</p></div>
            <div><p className="text-[11px] text-slate-400 dark:text-slate-500">Score</p><p className="text-base font-semibold text-slate-900 dark:text-white">{result.score_pdo}</p></div>
          </div>
        </Card>

        {/* Couverture ρc */}
        <Card className="p-6 flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 self-start">Couverture ρc</p>
          <CoverageRing rho={result.rho_c} />
          <p className={cn('text-sm font-semibold', rhoStyle.text)}>{formatRho(result.rho_c)}</p>
          {result.recommandation_rho?.afficher && (
            <div className="w-full px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{result.recommandation_rho.message}</p>
            </div>
          )}
        </Card>

        {/* Percentile + Actions */}
        <Card className="p-6 flex flex-col gap-4">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Positionnement</p>
          {result.percentile?.percentile != null ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
              <TrendingUp className="w-5 h-5 text-blue-500 mb-1" />
              <p className="text-3xl font-semibold text-slate-900 dark:text-white">{result.percentile.percentile}<span className="text-lg">e</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">Supérieur à <strong>{result.percentile.percentile}%</strong> des dossiers traités</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic">Non disponible</div>
          )}
          <div className="space-y-2 mt-auto">
            <Button className="w-full" onClick={handlePdf} loading={pdfLoading}>
              {!pdfLoading && <Download className="w-4 h-4" />}
              {pdfLoading ? 'Génération…' : 'Rapport PDF'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push(`/simul?client_id=${clientId}`)}>
              <FlaskConical className="w-4 h-4" />Simuler un scénario
            </Button>
            {onReset && (
              <Button variant="ghost" size="sm" className="w-full text-slate-400 dark:text-slate-500" onClick={onReset}>
                <RotateCcw className="w-3.5 h-3.5" />Nouveau scoring
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Bloc analyse de profil */}
      {result.anomaly_score != null && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            {result.is_anomaly ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Analyse de profil — Détection d'anomalie</p>
            <span className={cn('ml-auto px-2.5 py-1 text-xs font-semibold rounded-full border', anomalyStyle.badge)}>
              {anomalyStyle.label}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Score d'anomalie",     val: result.anomaly_score.toFixed(5),       sub: 'valeur calculée',     color: result.is_anomaly ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Seuil de détection',   val: result.if_seuil?.toFixed(5) ?? '—',    sub: result.if_percentile ? `percentile P${result.if_percentile}` : 'seuil référence',     color: 'text-slate-700 dark:text-slate-300' },
              { label: 'Recommandation initiale', val: result.decision_initiale ?? '—',
                sub: 'avant analyse de profil',
                color: result.decision_initiale === 'ACCORDE' ? 'text-emerald-600 dark:text-emerald-400' : result.decision_initiale === 'REFUSE' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Escalade détection',   val: result.if_escalade ? 'Oui — forcé' : 'Non', sub: result.if_escalade ? 'ACCORDÉ → REVUE' : 'décision conservée', color: result.if_escalade ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400' },
            ].map(({ label, val, sub, color }) => (
              <div key={label} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                <p className={cn('text-sm font-semibold font-mono', color)}>{val}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {result.if_seuil != null && (
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span>Score d'anomalie : <strong className="font-mono">{result.anomaly_score.toFixed(5)}</strong></span>
                <span>Seuil de détection : <strong className="font-mono">{result.if_seuil.toFixed(5)}</strong></span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                  style={{ left: `${Math.min((result.if_seuil / (result.if_seuil * 1.5)) * 100, 100)}%` }} />
                <div className={cn('h-full rounded-full transition-all', result.is_anomaly ? 'bg-rose-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min((result.anomaly_score / (result.if_seuil * 1.5)) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {result.is_anomaly
                  ? `Score d'anomalie (${result.anomaly_score.toFixed(5)}) au-dessus du seuil de détection (${result.if_seuil.toFixed(5)}) — profil atypique confirmé`
                  : `Score d'anomalie (${result.anomaly_score.toFixed(5)}) sous le seuil de détection (${result.if_seuil.toFixed(5)}) — profil normal`}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* SHAP Top 5 */}
      <Card className="p-6 space-y-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Explication du score — Facteurs déterminants</p>
        <div className="space-y-1">
          {result.shap_top5?.map((s, i) => (
            <ShapBar key={i} label={s.libelle_agent} shap_value={s.shap_value} poids_pct={s.poids_pct} explication_naturelle={s.explication_naturelle} />
          ))}
        </div>
      </Card>
    </div>
  );
}
