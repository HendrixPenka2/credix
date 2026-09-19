"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonTable } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/agent/clients/SearchBar";
import { FiltersBar, type ClientFilters } from "@/components/agent/clients/FiltersBar";
import { ClientsTable } from "@/components/agent/clients/ClientsTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import type { ClientSearchResult } from "@/lib/types";

const RHO_RANGES: Record<ClientFilters["rhoTier"], { rho_min?: number; rho_max?: number }> = {
  all: {},
  critique: { rho_max: 0.25 },
  partielle: { rho_min: 0.25, rho_max: 0.42 },
  suffisante: { rho_min: 0.42 },
};

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [filters, setFilters] = useState<ClientFilters>({ rhoTier: "all", decision: "all" });
  const [clients, setClients] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasActiveSearch = debouncedQuery.trim().length >= 2 || filters.rhoTier !== "all" || filters.decision !== "all";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (hasActiveSearch) {
        const range = RHO_RANGES[filters.rhoTier];
        const res = await clientsRepository.searchClients({
          q: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
          rho_min: range.rho_min,
          rho_max: range.rho_max,
          decision_derniere: filters.decision !== "all" ? filters.decision : undefined,
          limit: 30,
        });
        setClients(res.clients);
      } else {
        const res = await clientsRepository.getRecentlyScored(10);
        setClients(res.clients);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, hasActiveSearch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Clients</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {hasActiveSearch ? "Résultats de recherche." : "Les 10 derniers clients scorés."}
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/nouveau">
            <Icon name="person_add" size={18} />
            Nouveau client
          </Link>
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <SearchBar value={query} onChange={setQuery} />
        <FiltersBar filters={filters} onChange={setFilters} />
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="Aucun client trouvé"
          description={hasActiveSearch ? "Aucun résultat pour cette recherche." : "Aucun client scoré pour le moment."}
          actionLabel={hasActiveSearch ? "Créer ce client" : undefined}
          onAction={hasActiveSearch ? () => (window.location.href = "/clients/nouveau") : undefined}
        />
      ) : (
        <ClientsTable clients={clients} />
      )}
    </div>
  );
}
