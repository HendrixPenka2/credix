'use client';

import { useState, useEffect } from 'react';
import { Loader2, Dna } from 'lucide-react';
import { FeatureDrift } from '@/lib/types';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { PsiBadge } from '@/components/ui/badge';
import { FeatureDriftTable } from '@/components/superviseur/FeatureDriftTable';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

export function VariablesDriveView() {
  const [drift, setDrift]     = useState<FeatureDrift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    monitoringRepository.getFeatureDrift()
      .then(setDrift)
      .catch(() => setError('Impossible de charger la dérive par variable. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <Dna className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Dérive par variable</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Stabilité PSI de chacune des {drift?.nb_features_analysees ?? 27} variables du modèle
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
          {/* Résumé global */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Statut global', value: <PsiBadge statut={drift.statut_global} />, raw: null },
              { label: 'En dérive',    value: drift.nb_derives,    raw: drift.nb_derives,    color: 'rose'    },
              { label: 'Attention',    value: drift.nb_attention,   raw: drift.nb_attention,   color: 'amber'   },
              { label: 'Stables',      value: drift.nb_stables,     raw: drift.nb_stables,     color: 'emerald' },
              { label: 'Insuffisant',  value: drift.nb_insuffisant, raw: drift.nb_insuffisant, color: 'slate'   },
            ].map(({ label, value, raw, color }) => {
              const textCls: Record<string, string> = {
                rose: 'text-rose-600 dark:text-rose-400', amber: 'text-amber-600 dark:text-amber-400',
                emerald: 'text-emerald-600 dark:text-emerald-400', slate: 'text-slate-600 dark:text-slate-400',
              };
              return (
                <Card key={label} className="p-5">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                  {raw != null
                    ? <p className={cn('text-2xl font-semibold', color ? textCls[color] : '')}>{value as number}</p>
                    : <div className="mt-1">{value}</div>}
                </Card>
              );
            })}
          </div>

          {/* Contexte */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparaison : {drift.nb_demandes_reference} scores de référence → {drift.nb_demandes_actuelles} scores actuels
            </p>
            {drift.calcule_le && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Calculé le {new Date(drift.calcule_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <FeatureDriftTable drift={drift} />

          {drift.note && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{drift.note}</p>
          )}
        </>
      )}
    </div>
  );
}
