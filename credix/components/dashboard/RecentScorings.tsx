'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Inbox, ChevronRight, ShieldAlert } from 'lucide-react';
import { ClientSearchResult } from '@/lib/types';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { DecisionBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InitialsAvatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';

export function RecentScorings() {
  const router = useRouter();
  const [items, setItems]     = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsRepository.getRecentlyScored(6)
      .then(res => setItems(res.clients))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Derniers scorings
        </p>
        <button onClick={() => router.push('/clients')}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Voir tout
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun scoring récent" className="py-12" />
      ) : (
        <div className="space-y-0.5">
          {items.map(c => {
            const atypique = c.last_score?.is_anomaly;
            return (
              <button
                key={c.client_id}
                onClick={() => router.push(`/clients/${c.client_id}`)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="relative shrink-0">
                  <InitialsAvatar firstName={c.profile.prenom} lastName={c.profile.nom} className="w-9 h-9 text-xs" />
                  {atypique && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                      <ShieldAlert className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {c.profile.prenom} {c.profile.nom}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {c.last_score?.date && new Date(c.last_score.date).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {atypique && <span className="ml-1.5 text-rose-500 dark:text-rose-400 font-medium">· atypique</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300">
                    {c.last_score?.score_pdo}
                  </span>
                  {c.last_score && <DecisionBadge decision={c.last_score.decision} />}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
