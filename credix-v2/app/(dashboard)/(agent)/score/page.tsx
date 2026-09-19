"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScoringWizard } from "@/components/agent/scoring/ScoringWizard";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { Client } from "@/lib/types";

export default function ScorePage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");
  const [initialClient, setInitialClient] = useState<Client | undefined>(undefined);
  const [ready, setReady] = useState(!clientId);

  useEffect(() => {
    if (!clientId) return;
    clientsRepository
      .getClientById(clientId)
      .then(setInitialClient)
      .finally(() => setReady(true));
  }, [clientId]);

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Nouveau scoring</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Sélectionnez un client, renseignez les données de la demande et obtenez le score.</p>
      </div>
      <ScoringWizard initialClient={initialClient} />
    </div>
  );
}
