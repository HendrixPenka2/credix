'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileWarning, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ClientSearchResult } from '@/lib/types';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { InitialsAvatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

// Seuil thin-file — cohérent avec le reste du projet (badge/bannière ρc < 0.40)
const SEUIL_THIN_FILE = 0.40;

export function ThinFileWatch() {
  const router = useRouter();
  const [items, setItems]     = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsRepository.searchClients({ rho_max: SEUIL_THIN_FILE, limit: 30 })
      .then(res => {
        const sorted = [...res.clients].sort((a, b) => (a.coverage?.rho ?? 0) - (b.coverage?.rho ?? 0));
        setItems(sorted.slice(0, 6));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-500" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Dossiers à enrichir (thin-file)
          </p>
        </div>
        <button onClick={() => router.push('/clients?rho_max=0.4')}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Voir tout
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Aucun dossier thin-file en attente" className="py-12" />
      ) : (
        <div className="space-y-0.5">
          {items.map(c => {
            const rho = c.coverage?.rho ?? 0;
            const rhoStyle = getRhoStyle(rho);
            return (
              <button
                key={c.client_id}
                onClick={() => router.push(`/clients/${c.client_id}`)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <InitialsAvatar firstName={c.profile.prenom} lastName={c.profile.nom} className="w-9 h-9 text-xs shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {c.profile.prenom} {c.profile.nom}
                  </p>
                  <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={cn('h-full rounded-full', rho < 0.25 ? 'bg-rose-500' : 'bg-amber-500')}
                      style={{ width: `${Math.max(rho * 100, 4)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs font-semibold', rhoStyle.text)}>
                    {formatRho(rho)}
                  </span>
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
