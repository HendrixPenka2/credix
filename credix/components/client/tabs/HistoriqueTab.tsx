// DESTINATION: components/client/tabs/HistoriqueTab.tsx
// (remplace entièrement le fichier existant — même signature de props
// {history, loading}, donc aucune modification nécessaire côté appelant)
'use client';

import { Loader2, History as HistoryIcon } from 'lucide-react';
import { HistoryItem } from '@/components/client/types';
import { HistCharts } from '@/components/hist/HistCharts';
import { HistTable } from '@/components/hist/HistTable';

interface Props {
  history: HistoryItem[];
  loading: boolean;
}

export function HistoriqueTab({ history, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 text-center">
        <HistoryIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Aucun scoring pour ce client</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          L'historique apparaîtra ici après le premier scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HistCharts history={history} />
      <HistTable history={history} />
    </div>
  );
}