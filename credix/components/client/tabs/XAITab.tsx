'use client';

import { Activity, Loader2 } from 'lucide-react';
import { ShapBar } from '@/components/Charts';
import { HistoryItem } from '@/components/client/types';

interface Props {
  history: HistoryItem[];
  loading: boolean;
}

/**
 * Onglet Explicabilité — affiche les 5 facteurs SHAP du dernier scoring.
 *
 * Le premier item de l'historique (history[0]) est le scoring le plus récent.
 * Les données SHAP viennent de history[0].shap_top5.
 *
 * Si le backend ne retourne pas shap_top5 dans l'historique, on affiche
 * un message explicatif plutôt qu'un crash.
 */
export function XAITab({ history, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm text-slate-400 dark:text-slate-500">Chargement des données SHAP...</span>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const shapItems    = latest?.shap_top5;
  const hasShap      = Array.isArray(shapItems) && shapItems.length > 0;
  const hasHistory   = history.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Facteurs SHAP — Dernier scoring
        </p>
        {latest && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {new Date(latest.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {hasShap ? (
        <div className="space-y-3">
          {shapItems!.map((item, i) => (
            <ShapBar
              key={item.feature ?? i}
              label={item.libelle_agent ?? item.feature}
              shap_value={item.shap_value}
              poids_pct={item.poids_pct}
              explication_naturelle={item.explication_naturelle}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-14 text-center gap-3">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {!hasHistory
              ? 'Aucun scoring réalisé — données SHAP non disponibles.'
              : 'Les données SHAP ne sont pas retournées par cet endpoint.'}
          </p>
          {!hasHistory && (
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
              Lancez un scoring depuis le bouton "Nouveau scoring" pour générer les explications.
            </p>
          )}
        </div>
      )}
    </div>
  );
}