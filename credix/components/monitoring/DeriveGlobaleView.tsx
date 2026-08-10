'use client';

import { useState, useEffect } from 'react';
import { Loader2, Activity, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ModelDrift } from '@/lib/types';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { PsiGauge } from '@/components/superviseur/PsiGauge';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

interface Props {
  /** Route vers la page "Dérive par variable" — diffère entre superviseur et admin. */
  variablesHref: string;
}

export function DeriveGlobaleView({ variablesHref }: Props) {
  const router = useRouter();
  const [drift, setDrift]     = useState<ModelDrift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    monitoringRepository.getModelDrift()
      .then(setDrift)
      .catch(() => setError('Impossible de charger la dérive. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <Activity className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Dérive globale PSI</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Stabilité de la distribution des scores du modèle en production
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {!loading && !error && drift && (
        <>
          <div className="grid grid-cols-2 gap-5 items-start">
            <PsiGauge psi={drift.psi} statut={drift.statut} />

            {/* Statistiques et interprétation */}
            <div className="space-y-5">
              <Card className="p-6">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
                  Statistiques de calcul
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Scores de référence', value: drift.nb_scores_reference },
                    { label: 'Scores actuels', value: drift.nb_scores_actuels },
                    { label: 'Période de référence', value: drift.periode_reference ?? 'Train original' },
                    { label: 'Calculé le', value: drift.calcule_le ? new Date(drift.calcule_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Message interprétation */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                  Interprétation
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{drift.message}</p>
              </div>

              {/* Lien vers la dérive par variable */}
              <button onClick={() => router.push(variablesHref)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all text-left">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dérive par variable</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Voir le PSI de chacune des variables du modèle</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Grille explicative PSI */}
          <Card className="p-6">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
              Comment interpréter le PSI ?
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { range: 'PSI < 0.10',         status: 'STABLE',    color: 'emerald', desc: 'Distribution stable — le modèle se comporte comme attendu sur la population actuelle. Aucune action requise.' },
                { range: '0.10 ≤ PSI < 0.25',  status: 'ATTENTION', color: 'amber',   desc: 'Dérive légère détectée — surveiller l\'évolution. Une investigation des variables peut être utile.' },
                { range: 'PSI ≥ 0.25',          status: 'DÉRIVE',    color: 'rose',    desc: 'Dérive significative — la population actuelle diffère de la population d\'entraînement. Envisager un recalibrage.' },
              ].map(({ range, status, color, desc }) => {
                const cls: Record<string, string> = {
                  emerald: 'border-emerald-200 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-400',
                  amber:   'border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400',
                  rose:    'border-rose-200 dark:border-rose-700/30 text-rose-700 dark:text-rose-400',
                };
                return (
                  <div key={range} className={cn('p-4 rounded-lg border', cls[color])}>
                    <p className="text-xs font-semibold font-mono mb-1">{range}</p>
                    <p className="text-[11px] font-semibold mb-2">{status}</p>
                    <p className="text-[11px] opacity-80 leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
