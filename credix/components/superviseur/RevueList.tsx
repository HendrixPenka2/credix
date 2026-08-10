'use client';

import { ShieldAlert, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { DecisionPendingReview } from '@/lib/types';
import { formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { InitialsAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Props {
  dossiers: DecisionPendingReview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function tempsEcoule(timestamp: string) {
  const ms = Date.now() - new Date(timestamp).getTime();
  const jours = Math.floor(ms / 86_400_000);
  if (jours >= 1) return `${jours}j`;
  const heures = Math.floor(ms / 3_600_000);
  if (heures >= 1) return `${heures}h`;
  return `${Math.max(1, Math.floor(ms / 60_000))}min`;
}

export function RevueList({ dossiers, selectedId, onSelect }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} en attente — du plus ancien au plus récent
        </p>
      </div>

      <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
        {dossiers.map(d => {
          const active = d.demande_id === selectedId;
          const top3 = (d.shap_top5 ?? []).slice(0, 3);
          const rhoStyle = getRhoStyle(d.rho_c);
          return (
            <button
              key={d.demande_id}
              onClick={() => onSelect(d.demande_id)}
              className={cn(
                'w-full flex flex-col gap-1.5 px-5 py-3.5 text-left transition-colors',
                active ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <InitialsAvatar firstName={d.client_prenom} lastName={d.client_nom} className="w-9 h-9 text-xs" />
                  {d.is_anomaly && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                      <ShieldAlert className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold truncate', active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100')}>
                    {d.client_prenom} {d.client_nom}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />il y a {tempsEcoule(d.timestamp)}
                    </span>
                    {d.if_escalade && (
                      <span className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 uppercase">interceptée</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white">{d.score_pdo}</span>
                  <span className={cn('text-[10px] font-semibold', rhoStyle.text)}>
                    ρc {formatRho(d.rho_c)}
                  </span>
                </div>
              </div>

              {/* SHAP top 3 — version allégée : flèche colorée + texte, pas de badge plein */}
              {top3.length > 0 && (
                <div className="flex items-center gap-3 pl-12 overflow-hidden">
                  {top3.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate shrink-0 max-w-[140px]">
                      {s.direction === 'aggravant'
                        ? <ArrowUp className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                        : <ArrowDown className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                      <span className="truncate">{s.libelle_agent}</span>
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
