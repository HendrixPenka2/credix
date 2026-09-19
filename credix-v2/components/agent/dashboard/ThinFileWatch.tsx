"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton";
import { getRhoStyle } from "@/lib/design-tokens";
import type { ClientSearchResult } from "@/lib/types";

/** Clients à dossier incomplet (ρc < 42%) à relancer — cf. cdc_credix.md §5.2 /dashboard. */
export function ThinFileWatch({ clients, loading }: { clients: ClientSearchResult[] | null; loading: boolean }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden flex flex-col">
      <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface-container-low/50">
        <div className="flex items-center gap-2">
          <h3 className="font-headline-sm text-on-surface">Dossiers incomplets</h3>
          <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-mono text-xs">Thin-file</span>
        </div>
        <span className="font-label-md text-on-surface-variant">ρc &lt; 42%</span>
      </div>
      <div className="flex-1 p-4 space-y-3">
        {loading || !clients ? (
          <SkeletonCard />
        ) : clients.length === 0 ? (
          <EmptyState icon="task_alt" title="Aucun dossier incomplet" description="Tous vos clients ont une couverture suffisante." />
        ) : (
          clients.map((c) => {
            const style = getRhoStyle(c.coverage.rho);
            return (
              <Link
                key={c.client_id}
                href={`/clients/${c.client_id}`}
                className="flex items-center justify-between p-3 border border-outline-variant/60 rounded-lg hover:border-outline transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                    <Icon name="person" />
                  </span>
                  <div>
                    <p className="font-data-sm text-on-surface">
                      {c.profile.nom}, {c.profile.prenom}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">{c.client_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-on-surface-variant">ρc =</span>
                      <span className={`font-data-sm ${style.text}`}>{Math.round(c.coverage.rho * 100)}%</span>
                    </div>
                    <div className="w-16 h-1.5 bg-outline-variant/30 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${c.coverage.rho * 100}%` }} />
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-outline group-hover:text-secondary transition-colors" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
