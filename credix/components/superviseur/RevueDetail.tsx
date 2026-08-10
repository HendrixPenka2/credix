'use client';

import { ShieldAlert, ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { useState } from 'react';
import { DecisionPendingReview } from '@/lib/types';
import { ScoreGauge, CoverageRing, ShapBar } from '@/components/Charts';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { formatPd, formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { RevueProfilCard } from './RevueProfilCard';
import { RevueFeaturesPanel } from './RevueFeaturesPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface Props { dossier: DecisionPendingReview; }

export function RevueDetail({ dossier }: Props) {
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const rhoStyle = getRhoStyle(dossier.rho_c);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await decisionsRepository.downloadPdf(dossier.demande_id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `rapport-${dossier.demande_id}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'error', title: 'Erreur lors du téléchargement PDF' });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Header client ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InitialsAvatar firstName={dossier.client_prenom} lastName={dossier.client_nom} className="w-11 h-11 text-sm" />
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {dossier.client_prenom} {dossier.client_nom}
              </p>
              <code className="text-xs text-slate-400 dark:text-slate-500">{dossier.client_id}</code>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handlePdf} loading={pdfLoading}>
            {!pdfLoading && <Download className="w-3.5 h-3.5" />}
            Rapport PDF
          </Button>
        </div>
      </Card>

      {/* ── Bannière interception ── */}
      {dossier.if_escalade && (
        <div className="flex items-start gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-300/60 dark:border-rose-700/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Dossier intercepté par l'analyse de profil
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              Le score recommandait un accord, mais l'analyse de profil a détecté un comportement atypique
              et a forcé ce dossier en revue manuelle.
            </p>
          </div>
        </div>
      )}

      {/* ── Profil emprunteur + Données de la demande ── */}
      <RevueProfilCard dossier={dossier} />

      {/* ── Score + ρc + Analyse de profil ── */}
      <div className="grid grid-cols-3 gap-5">
        <Card className="p-6 flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 self-start">Score PDO</p>
          <ScoreGauge score={dossier.score_pdo} />
          <p className="text-xs text-slate-500 dark:text-slate-400">PD : {formatPd(dossier.pd_c)}</p>
        </Card>

        <Card className="p-6 flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 self-start">Couverture ρc</p>
          <CoverageRing rho={dossier.rho_c} />
          <p className={cn('text-xs font-semibold', rhoStyle.text)}>
            {formatRho(dossier.rho_c)}
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Analyse de profil</p>
          {dossier.anomaly_score != null ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
              {dossier.is_anomaly
                ? <ShieldAlert className="w-7 h-7 text-rose-500" />
                : <ShieldCheck className="w-7 h-7 text-emerald-500" />}
              <p className={cn('text-xs font-semibold', dossier.is_anomaly ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                {dossier.is_anomaly ? 'Profil atypique' : 'Profil normal'}
              </p>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{dossier.anomaly_score.toFixed(5)}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic">
              Non disponible
            </div>
          )}
        </Card>
      </div>

      {/* ── Recommandation ρc ── */}
      {dossier.recommandation_rho?.afficher && (
        <div className="px-5 py-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-700/30">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Dossier {dossier.recommandation_rho.niveau_urgence === 'CRITIQUE' ? 'très incomplet' : 'partiellement incomplet'}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{dossier.recommandation_rho.message}</p>
        </div>
      )}

      {/* ── SHAP ── */}
      <Card className="p-6 space-y-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Facteurs déterminants
        </p>
        <div className="space-y-1">
          {dossier.shap_top5?.map((s, i) => (
            <ShapBar key={i} label={s.libelle_agent} shap_value={s.shap_value} poids_pct={s.poids_pct} explication_naturelle={s.explication_naturelle} />
          ))}
        </div>
      </Card>

      {/* ── Toutes les variables — collapsible, transparence totale ── */}
      <RevueFeaturesPanel features={dossier.client_features} />
    </div>
  );
}
