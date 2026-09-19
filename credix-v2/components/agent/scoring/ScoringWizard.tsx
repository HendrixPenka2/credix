"use client";

import { useState } from "react";
import { Stepper } from "@/components/shared/Stepper";
import { Banner } from "@/components/shared/Banner";
import { ClientStep } from "./ClientStep";
import { DeclaratifStep } from "./DeclaratifStep";
import { ResultStep } from "./ResultStep";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import type { Client, ScoringResult } from "@/lib/types";

const STEPS = ["Sélection", "Données", "Résultat"];

export interface ScoringWizardProps {
  /** Fourni depuis la fiche client (onglet "Nouveau scoring") pour sauter l'étape 1. */
  initialClient?: Client;
  /** Masque le Stepper pleine page quand le wizard est intégré dans un onglet. */
  embedded?: boolean;
}

export function ScoringWizard({ initialClient, embedded = false }: ScoringWizardProps) {
  const [stepIndex, setStepIndex] = useState(initialClient ? 1 : 0);
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeclaratifSubmit(declaratif: Record<string, any>) {
    if (!client) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await scoringRepository.predict(client.client_id, declaratif);
      setResult(res);
      setStepIndex(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Le scoring a échoué. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setClient(initialClient);
    setResult(null);
    setError(null);
    setStepIndex(initialClient ? 1 : 0);
  }

  return (
    <div className="space-y-6">
      {!embedded && <Stepper steps={STEPS} currentIndex={stepIndex} />}

      {error && <Banner variant="critical" title="Erreur de scoring" description={error} />}

      {submitting ? (
        <div className="text-center py-16 font-body-sm text-on-surface-variant">Calcul du score en cours...</div>
      ) : stepIndex === 0 ? (
        <ClientStep
          onSelect={(c) => {
            setClient(c);
            setStepIndex(1);
          }}
        />
      ) : stepIndex === 1 && client ? (
        <DeclaratifStep client={client} onBack={() => setStepIndex(0)} onSubmit={handleDeclaratifSubmit} />
      ) : stepIndex === 2 && result && client ? (
        <ResultStep result={result} client={client} onRestart={restart} />
      ) : null}
    </div>
  );
}
