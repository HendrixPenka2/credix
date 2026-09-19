"use client";

import { useCallback, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonProfileHeader, SkeletonCard } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { ClientHeader } from "@/components/agent/client-fiche/ClientHeader";
import { ClientBanners } from "@/components/agent/client-fiche/ClientBanners";
import { ModifierProfilModal } from "@/components/agent/client-fiche/ModifierProfilModal";
import { OverviewTab } from "@/components/agent/client-fiche/tabs/OverviewTab";
import { NouveauScoringTab } from "@/components/agent/client-fiche/tabs/NouveauScoringTab";
import { SimulationTab } from "@/components/agent/client-fiche/tabs/SimulationTab";
import { HistoriqueTab } from "@/components/agent/client-fiche/tabs/HistoriqueTab";
import { ExplicabiliteTab } from "@/components/agent/client-fiche/tabs/ExplicabiliteTab";
import { ProgressionTab } from "@/components/agent/client-fiche/tabs/ProgressionTab";
import type { Client } from "@/lib/types";

export default function ClientFichePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";
  const [editOpen, setEditOpen] = useState(false);

  const { data: client, loading, error, refetch } = useApi<Client>(useCallback(() => clientsRepository.getClientById(params.id), [params.id]));
  const [override, setOverride] = useState<Client | null>(null);
  const current = override ?? client;

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonProfileHeader />
        <SkeletonCard className="h-96" />
      </div>
    );
  }
  if (error || !current) return <ErrorState message={error ?? undefined} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <ClientHeader client={current} onEdit={() => setEditOpen(true)} />
      <ClientBanners client={current} />

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="scoring">Nouveau scoring</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="explicabilite">Explicabilité</TabsTrigger>
          <TabsTrigger value="progression">Progression</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab client={current} />
        </TabsContent>
        <TabsContent value="scoring">
          <NouveauScoringTab client={current} />
        </TabsContent>
        <TabsContent value="simulation">
          <SimulationTab client={current} />
        </TabsContent>
        <TabsContent value="historique">
          <HistoriqueTab client={current} />
        </TabsContent>
        <TabsContent value="explicabilite">
          <ExplicabiliteTab client={current} />
        </TabsContent>
        <TabsContent value="progression">
          <ProgressionTab client={current} />
        </TabsContent>
      </Tabs>

      <ModifierProfilModal client={current} open={editOpen} onOpenChange={setEditOpen} onUpdated={setOverride} />
    </div>
  );
}
