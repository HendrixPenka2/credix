"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClientPicker } from "@/components/agent/hist/ClientPicker";
import { HistPanel } from "@/components/agent/hist/HistPanel";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { ClientSearchResult } from "@/lib/types";

export default function HistPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("client");
  const [client, setClient] = useState<ClientSearchResult | null>(null);

  useEffect(() => {
    if (!preselectedId) return;
    clientsRepository.getClientById(preselectedId).then((c) =>
      setClient({ client_id: c.client_id, profile: c.profile, coverage: c.coverage, last_score: c.last_score, created_at: c.created_at ?? "" })
    );
  }, [preselectedId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Historique de scoring</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {client ? `${client.profile.prenom} ${client.profile.nom} — ${client.client_id}` : "Sélectionnez un client pour voir son historique."}
          </p>
        </div>
        {client && (
          <button className="font-body-sm text-secondary hover:underline" onClick={() => setClient(null)}>
            Changer de client
          </button>
        )}
      </div>

      {!client ? <ClientPicker onSelect={setClient} /> : <HistPanel clientId={client.client_id} />}
    </div>
  );
}
