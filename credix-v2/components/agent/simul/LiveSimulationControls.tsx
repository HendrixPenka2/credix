"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { scoringRepository } from "@/lib/repositories/scoring.repository";
import { OCCUPATION_TYPES } from "@/components/agent/clients-nouveau/options";
import type { Client, SimulationResult } from "@/lib/types";

const FALLBACK_OPTIONS: Record<string, string[]> = {
  OCCUPATION_TYPE: OCCUPATION_TYPES.map((o) => o.value),
};

export interface LiveSimulationControlsProps {
  client: Client;
  declaratif: Record<string, any>;
  onLiveResult: (result: SimulationResult, declaratif: Record<string, any>) => void;
}

/**
 * Panneau d'ajustement en direct des paramètres de simulation — évite de
 * revenir à l'étape "Données" et de resoumettre pour voir l'effet d'un
 * changement. Chaque modification relance /simulate (débounce 400ms) et met
 * à jour l'écran de comparaison en place.
 *
 * Répond au retour utilisateur : "je dois pouvoir ajuster les paramètres
 * directement et voir l'effet, sans avoir à retaper/relancer en bas."
 */
export function LiveSimulationControls({ client, declaratif, onLiveResult }: LiveSimulationControlsProps) {
  const { data: schema } = useApi(useCallback(() => scoringRepository.getFormSchema(), []));
  const [values, setValues] = useState<Record<string, any>>(declaratif);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(values, 400);

  // Si l'appelant change de scénario de base (ex. nouvelle simulation),
  // resynchronise l'état local sur les nouvelles valeurs déclaratives.
  useEffect(() => {
    setValues(declaratif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.client_id]);

  const skipNext = useRef(true);
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    let cancelled = false;
    async function run() {
      setPending(true);
      setError(null);
      try {
        const res = await scoringRepository.simulate(client.client_id, debounced);
        if (!cancelled) onLiveResult(res, debounced);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.detail || "Impossible de recalculer la simulation.");
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, client.client_id]);

  if (!schema) return null;
  const champs = client.is_new_client ? schema.champs : schema.champs.filter((c) => c.is_request_specific);

  return (
    <Card className="p-card-padding border-2 border-simulation-orange/40">
      <div className="flex items-center justify-between mb-1">
        <CardTitle className="flex items-center gap-2">
          <Icon name="tune" size={18} className="text-simulation-orange" />
          Ajuster le scénario
        </CardTitle>
        {pending && <span className="font-body-sm text-simulation-orange animate-pulse">Recalcul en cours…</span>}
      </div>
      <p className="font-body-sm text-on-surface-variant mb-4">
        Modifiez une valeur pour voir immédiatement son effet sur le score simulé ci-dessus.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {champs.map((champ) => {
          const options = champ.options ?? FALLBACK_OPTIONS[champ.nom];
          const value = values[champ.nom] ?? "";
          return (
            <div key={champ.nom}>
              <label className="block font-label-md text-on-surface-variant mb-1.5">{champ.label}</label>
              {champ.type === "select" && options ? (
                <Select value={value} onValueChange={(v) => setValues((prev) => ({ ...prev, [champ.nom]: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : champ.type === "date" ? (
                <Input type="date" value={value} onChange={(e) => setValues((prev) => ({ ...prev, [champ.nom]: e.target.value }))} />
              ) : champ.type === "number" ? (
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValues((prev) => ({ ...prev, [champ.nom]: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              ) : (
                <Input type="text" value={value} onChange={(e) => setValues((prev) => ({ ...prev, [champ.nom]: e.target.value }))} />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="font-body-sm text-danger-rose mt-3">{error}</p>}
    </Card>
  );
}
