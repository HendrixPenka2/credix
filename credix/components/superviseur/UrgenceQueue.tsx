'use client';

import { useRouter } from 'next/navigation';
import { Clock, ArrowRight, Inbox } from 'lucide-react';
import { DecisionPendingReview } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { InitialsAvatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface Props { dossiers: DecisionPendingReview[]; }

function tempsEcoule(timestamp: string) {
  const ms = Date.now() - new Date(timestamp).getTime();
  const jours = Math.floor(ms / 86_400_000);
  if (jours >= 1) return { label: `${jours}j`, urgent: jours >= 3 };
  const heures = Math.floor(ms / 3_600_000);
  if (heures >= 1) return { label: `${heures}h`, urgent: heures >= 12 };
  return { label: `${Math.max(1, Math.floor(ms / 60_000))}min`, urgent: false };
}

export function UrgenceQueue({ dossiers }: Props) {
  const router = useRouter();
  const top3 = dossiers.slice(0, 3);

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          File d'urgence
        </p>
        <button onClick={() => router.push('/superviseur/revue')}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          Tout voir <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {top3.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun dossier en attente" className="py-8" />
      ) : (
        <div className="space-y-3">
          {top3.map(d => {
            const { label, urgent } = tempsEcoule(d.timestamp);
            return (
              <button
                key={d.demande_id}
                onClick={() => router.push('/superviseur/revue')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left"
              >
                <InitialsAvatar firstName={d.client_prenom} lastName={d.client_nom} className="w-8 h-8 text-[10px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {d.client_prenom} {d.client_nom}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className={cn('w-3 h-3', urgent ? 'text-rose-500' : 'text-slate-400')} />
                    <span className={cn('text-[10px] font-medium', urgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500')}>
                      {label}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300 shrink-0">
                  {d.score_pdo}
                </span>
              </button>
            );
          })}
          {dossiers.length > 3 && (
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-1">
              +{dossiers.length - 3} autre{dossiers.length - 3 > 1 ? 's' : ''} dossier{dossiers.length - 3 > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
