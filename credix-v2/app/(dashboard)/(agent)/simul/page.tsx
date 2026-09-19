"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SimulationBanner } from "@/components/shared/Banner";
import { SimulationWizard } from "@/components/agent/simul/SimulationWizard";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { Client } from "@/lib/types";

export default function SimulPage() {
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
    <div className="space-y-6 -m-gutter">
      <SimulationBanner />
      <div className="px-gutter space-y-6 pb-6">
        <div>
          <h2 className="font-headline-lg text-on-surface">Simulateur what-if</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">Testez un scénario sans enregistrer de décision officielle.</p>
        </div>
        <SimulationWizard initialClient={initialClient} />
      </div>
    </div>
  );
}
