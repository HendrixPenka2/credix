'use client';

import { ShieldAlert, ShieldCheck, AlertOctagon } from 'lucide-react';
import { AnomalyStatistics } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props { stats: AnomalyStatistics; }

export function AnomalyInsights({ stats }: Props) {
  if (stats.nb_dossiers_analyses === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Détection d'anomalie — Analyse de profil
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 italic">
          Aucune donnée d'analyse de profil sur cette période.
        </p>
      </Card>
    );
  }

  const seuil = stats.seuil_anomalie;
  const moyen = stats.anomaly_score_moyen;
  const echelle = seuil != null ? seuil * 1.5 : 1;
  const ratioMoyen = seuil != null && moyen != null ? Math.min((moyen / echelle) * 100, 100) : 0;
  const ratioSeuil = seuil != null ? Math.min((seuil / echelle) * 100, 100) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShieldAlert className="w-4 h-4 text-rose-500" />
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Détection d'anomalie — Analyse de profil
        </p>
        <Badge tone="danger" className="ml-auto">{stats.taux_anomalie_pct}% du portefeuille</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">
            Dossiers analysés
          </p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{stats.nb_dossiers_analyses}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">sur la période</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">
            Profils atypiques
          </p>
          <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{stats.nb_anomalies}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{stats.taux_anomalie_pct}% détectés</p>
        </div>

        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200/60 dark:border-rose-700/30 text-center">
          <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 mb-2 flex items-center justify-center gap-1">
            <AlertOctagon className="w-3 h-3" />Dossiers interceptés
          </p>
          <p className="text-xl font-semibold text-rose-700 dark:text-rose-400">{stats.nb_escalades}</p>
          <p className="text-[10px] text-rose-500/80 dark:text-rose-400/70 mt-1">accord initial → revue forcée</p>
        </div>
      </div>

      {seuil != null && moyen != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Score d'anomalie moyen : <strong className="font-mono">{moyen.toFixed(5)}</strong></span>
            <span>Seuil de détection : <strong className="font-mono">{seuil.toFixed(5)}</strong></span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10" style={{ left: `${ratioSeuil}%` }} />
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${ratioMoyen}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Le score moyen du portefeuille reste {moyen < seuil ? 'en-dessous' : 'au-dessus'} du seuil de détection.
          </p>
        </div>
      )}

      {stats.nb_escalades > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
          Sur {stats.nb_dossiers_analyses} dossiers analysés,{' '}
          <strong className="text-rose-600 dark:text-rose-400">
            {stats.nb_escalades} dossier{stats.nb_escalades > 1 ? 's' : ''}
          </strong>{' '}
          initialement accordé{stats.nb_escalades > 1 ? 's' : ''} par le score a été intercepté avant
          validation finale, suite à la détection d'un profil atypique.
        </p>
      )}
    </Card>
  );
}
