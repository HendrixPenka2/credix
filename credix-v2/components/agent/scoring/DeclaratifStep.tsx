"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonText } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/useApi";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import { DeclaratifField } from "./DeclaratifField";
import type { Client } from "@/lib/types";

export interface DeclaratifStepProps {
  client: Client;
  onBack: () => void;
  onSubmit: (declaratif: Record<string, any>) => void;
  submitLabel?: string;
  accentTone?: "neutral" | "orange";
}

/**
 * Formulaire de données de la demande, entièrement dérivé de
 * GET /api/scoring/form-schema — client nouveau : tous les champs ;
 * client existant : seulement les champs "de la demande" (is_request_specific),
 * cf. cdc_credix.md §5.2 /score.
 */
export function DeclaratifStep({ client, onBack, onSubmit, submitLabel = "Continuer", accentTone = "neutral" }: DeclaratifStepProps) {
  const { data: schema, loading, error } = useApi(useCallback(() => scoringRepository.getFormSchema(), []));
  const [values, setValues] = useState<Record<string, any>>({});
  const [touched, setTouched] = useState(false);

  if (loading || !schema) {
    return (
      <Card className="p-card-padding">
        <SkeletonText lines={6} />
      </Card>
    );
  }
  if (error) return <ErrorState message={error} />;

  const champs = client.is_new_client ? schema.champs : schema.champs.filter((c) => c.is_request_specific);

  const missing = champs.filter((c) => c.obligatoire && (values[c.nom] === undefined || values[c.nom] === ""));

  return (
    <Card className="p-card-padding">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="assignment" className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Données de la demande</h3>
      </div>
      <p className="font-body-sm text-on-surface-variant mb-4">
        {client.profile.prenom} {client.profile.nom} — {client.client_id}
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {champs.map((champ) => (
          <DeclaratifField
            key={champ.nom}
            champ={champ}
            value={values[champ.nom]}
            onChange={(v) => setValues((prev) => ({ ...prev, [champ.nom]: v }))}
          />
        ))}
      </div>

      {touched && missing.length > 0 && (
        <p className="font-body-sm text-danger-rose mt-4">Merci de compléter tous les champs obligatoires.</p>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button
          variant={accentTone === "orange" ? "secondary" : "primary"}
          className={accentTone === "orange" ? "bg-simulation-orange text-white hover:opacity-90" : undefined}
          onClick={() => {
            setTouched(true);
            if (missing.length === 0) onSubmit(values);
          }}
        >
          {submitLabel}
          <Icon name="arrow_forward" size={16} />
        </Button>
      </div>
    </Card>
  );
}
