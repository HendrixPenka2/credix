"use client";

import { useState } from "react";
import { Stepper } from "@/components/shared/Stepper";
import { Banner } from "@/components/shared/Banner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ClientStep } from "@/components/agent/scoring/ClientStep";
import { DeclaratifStep } from "@/components/agent/scoring/DeclaratifStep";
import { SimulationComparison } from "./SimulationComparison";
import { LiveSimulationControls } from "./LiveSimulationControls";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import type { Client, SimulationResult } from "@/lib/types";

const STEPS = ["Sélection", "Données", "Comparaison"];

export interface SimulationWizardProps {
  initialClient?: Client;
  embedded?: boolean;
}

export function SimulationWizard({ initialClient, embedded = false }: SimulationWizardProps) {
  const [stepIndex, setStepIndex] = useState(initialClient ? 1 : 0);
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [declaratif, setDeclaratif] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeclaratifSubmit(values: Record<string, any>) {
    if (!client) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await scoringRepository.simulate(client.client_id, values);
      setResult(res);
      setDeclaratif(values);
      setStepIndex(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || "La simulation a échoué. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setResult(null);
    setError(null);
    setStepIndex(1);
  }

  return (
    <div className="space-y-6">
      {!embedded && <Stepper steps={STEPS} currentIndex={stepIndex} tone="orange" />}

      {error && <Banner variant="critical" title="Erreur de simulation" description={error} />}

      {submitting ? (
        <div className="text-center py-16 font-body-sm text-on-surface-variant">Calcul de la simulation en cours...</div>
      ) : stepIndex === 0 ? (
        <ClientStep
          onSelect={(c) => {
            setClient(c);
            setStepIndex(1);
          }}
        />
      ) : stepIndex === 1 && client ? (
        <DeclaratifStep
          client={client}
          onBack={() => setStepIndex(0)}
          onSubmit={handleDeclaratifSubmit}
          submitLabel="Mettre à jour la simulation"
          accentTone="orange"
        />
      ) : stepIndex === 2 && result && client ? (
        <div className="space-y-4">
          <SimulationComparison result={result} client={client} />
          <LiveSimulationControls
            client={client}
            declaratif={declaratif}
            onLiveResult={(liveResult, liveDeclaratif) => {
              setResult(liveResult);
              setDeclaratif(liveDeclaratif);
            }}
          />
          <div className="flex justify-center">
            <Button variant="ghost" onClick={restart}>
              <Icon name="refresh" size={18} />
              Nouvelle simulation
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
