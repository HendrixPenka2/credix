"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ErrorState } from "@/components/shared/ErrorState";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { RhoBadge } from "@/components/shared/StatusPill";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { Client, ClientSearchResult } from "@/lib/types";

export function ClientStep({ onSelect }: { onSelect: (client: Client) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(result: ClientSearchResult) {
    setLoading(true);
    setError(null);
    try {
      const client = await clientsRepository.getClientById(result.client_id);
      onSelect(client);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de charger ce client.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-card-padding">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="person_search" className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Sélection du client</h3>
      </div>
      <ClientSelector onSelect={handlePick} />
      {loading && <p className="font-body-sm text-on-surface-variant mt-3">Chargement du dossier client...</p>}
      {error && <ErrorState message={error} className="py-6" />}
    </Card>
  );
}
