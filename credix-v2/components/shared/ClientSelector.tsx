"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { AvatarNameRow } from "./AvatarNameRow";
import { RhoBadge } from "./StatusPill";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { ClientSearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ClientSelectorProps {
  onSelect: (client: ClientSearchResult) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Sélecteur de client avec recherche debouncée — brique réutilisée sur
 * scoring/simulation/historique (cdc_credix.md §6.6).
 */
export function ClientSelector({ onSelect, placeholder = "Rechercher un client par nom ou identifiant...", className }: ClientSelectorProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await clientsRepository.searchClients({ q, limit: 8 });
      setResults(res.clients);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return (
    <div className={cn("relative", className)}>
      <Input
        icon={<Icon name="search" size={18} />}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          {loading && <div className="p-3 font-body-sm text-on-surface-variant">Recherche...</div>}
          {!loading &&
            results.map((client) => (
              <button
                key={client.client_id}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors"
                onMouseDown={() => {
                  onSelect(client);
                  setQuery(`${client.profile.prenom} ${client.profile.nom}`);
                  setOpen(false);
                }}
              >
                <AvatarNameRow firstName={client.profile.prenom} lastName={client.profile.nom} subtitle={client.client_id} size="sm" />
                <RhoBadge rho={client.coverage.rho} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
