"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { ClientSearchResult } from "@/lib/types";

/** Recherche globale de clients dans la topbar — commune aux 3 rôles (cdc_credix.md §4). */
export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await clientsRepository.searchClients({ q, limit: 6 });
      setResults(res.clients);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    search(debounced);
  }, [debounced, search]);

  return (
    <div className="relative w-full max-w-sm">
      <Input
        icon={<Icon name="search" size={18} />}
        placeholder="Rechercher un client..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="bg-surface-container-low border-transparent"
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          {results.map((client) => (
            <button
              key={client.client_id}
              type="button"
              className="flex w-full items-center px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors"
              onMouseDown={() => {
                router.push(`/clients/${client.client_id}`);
                setQuery("");
                setOpen(false);
              }}
            >
              <AvatarNameRow firstName={client.profile.prenom} lastName={client.profile.nom} subtitle={client.client_id} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
