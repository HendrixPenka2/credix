'use client';

import { useRouter } from 'next/navigation';
import { Brain, ArrowRight } from 'lucide-react';
import type { ModelDrift, ModelVersion } from '@/lib/types/monitoring';
import { Card } from '@/components/ui/card';
import { PsiBadge } from '@/components/ui/badge';

interface Props {
  drift: ModelDrift | null;
  versions: ModelVersion[] | null;
}

export function ModelHealth({ drift, versions }: Props) {
  const router = useRouter();
  const prod = versions?.find((v) => v.statut === 'PRODUCTION');
  const psi  = drift?.psi;

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Santé du modèle IA
          </p>
        </div>
        <button onClick={() => router.push('/superviseur/modele/derive')}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          Détail <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Badge statut PSI */}
      <div className="flex items-center gap-3 mb-5">
        <PsiBadge statut={drift?.statut} />
        {psi != null && (
          <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
            PSI = {psi.toFixed(3)}
          </span>
        )}
      </div>

      {/* Métriques modèle en production */}
      <div className="space-y-3">
        {prod ? (
          <>
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">Version en production</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{prod.version ?? prod.nom_version ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">AUC</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{prod.metriques?.auc?.toFixed(4) ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">Gini</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{prod.metriques?.gini?.toFixed(4) ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Scores de référence</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{drift?.nb_scores_reference ?? '—'}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">Aucun modèle en production.</p>
        )}
      </div>
    </Card>
  );
}
