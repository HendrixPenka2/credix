'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { Client, ScoreProgression } from '@/lib/types';
import { ClientBanners } from '@/components/client/ClientBanners';
import { ClientHeader } from '@/components/client/ClientHeader';
import { ScoreTab } from '@/components/client/tabs/ScoreTab';
import { XAITab } from '@/components/client/tabs/XAITab';
import { HistoriqueTab } from '@/components/client/tabs/HistoriqueTab';
import { ProgressionTab } from '@/components/client/tabs/ProgressionTab';
import { HistoryItem } from '@/components/client/types';
import { ScoringTab } from '@/components/client/tabs/ScoringTab';
import { SimulationTab } from '@/components/client/tabs/SimulationTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton, SkeletonProfileHeader, SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';

type Tab = 'score' | 'scoring' | 'simulation' | 'xai' | 'historique' | 'progression';

const TABS: { key: Tab; label: string }[] = [
  { key: 'score',       label: "Vue d'ensemble" },
  { key: 'scoring',     label: 'Nouveau scoring' },
  { key: 'simulation',  label: 'Simulation' },
  { key: 'historique',  label: 'Historique' },
  { key: 'xai',         label: 'Explicabilité (XAI)' },
  { key: 'progression', label: 'Progression' },
];

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [client,      setClient]      = useState<Client | null>(null);
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [progression, setProgression] = useState<ScoreProgression | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingProg, setLoadingProg] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<Tab>('score');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      clientsRepository.getClientById(id),
      scoringRepository.getScoringHistory(id),
    ])
      .then(([c, h]) => {
        setClient(c);
        setHistory((h as any)?.historique ?? []);
      })
      .catch(() => setError('Impossible de charger le profil client.'))
      .finally(() => setLoading(false));
  }, [id]);

  const refetchClient = useCallback(async () => {
    if (!id) return;
    try {
      const c = await clientsRepository.getClientById(id);
      setClient(c);
    } catch {
      // silencieux — les données actuelles restent affichées
    }
  }, [id]);

  useEffect(() => {
    if (tab !== 'progression' || !id || progression) return;
    setLoadingProg(true);
    clientsRepository.getScoreProgression(id)
      .then(setProgression)
      .catch(() => setProgression(null))
      .finally(() => setLoadingProg(false));
  }, [tab, id, progression]);

  const BackLink = () => (
    <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
      <ArrowLeft className="w-3.5 h-3.5" />Retour à la liste
    </button>
  );

  if (loading) {
    return (
      <div className="w-full space-y-5">
        <BackLink />
        <SkeletonProfileHeader />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <Skeleton className="h-9 w-96 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full space-y-5">
        <BackLink />
        <ErrorState message={error ?? 'Ce client est introuvable.'} onRetry={() => window.location.reload()} />
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-3.5 h-3.5" />Retour
          </Button>
        </div>
      </div>
    );
  }

  const { coverage, is_new_client, client_id } = client;
  const latestDecision = history.length > 0 ? history[history.length - 1] : undefined;

  return (
    <div className="w-full space-y-5">

      <BackLink />

      <ClientBanners
        clientId={client_id}
        isNewClient={is_new_client}
        hasHistory={client.last_score != null}
        rho={coverage?.rho ?? 0}
      />

      <ClientHeader client={client} onRefetch={refetchClient} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="score"><ScoreTab client={client} latestDecision={latestDecision} /></TabsContent>
        <TabsContent value="scoring"><ScoringTab client={client} onScored={refetchClient} /></TabsContent>
        <TabsContent value="simulation"><SimulationTab client={client} /></TabsContent>
        <TabsContent value="xai"><XAITab history={history} loading={false} /></TabsContent>
        <TabsContent value="historique"><HistoriqueTab history={history} loading={false} /></TabsContent>
        <TabsContent value="progression"><ProgressionTab progression={progression} loading={loadingProg} /></TabsContent>
      </Tabs>
    </div>
  );
}
