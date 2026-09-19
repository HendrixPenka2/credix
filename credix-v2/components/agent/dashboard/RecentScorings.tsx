"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import type { ClientSearchResult } from "@/lib/types";

export function RecentScorings({ clients, loading }: { clients: ClientSearchResult[] | null; loading: boolean }) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden">
      <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface-container-low/50">
        <h3 className="font-headline-sm text-on-surface">Derniers clients scorés</h3>
        <Link href="/clients" className="font-body-sm font-medium text-secondary hover:underline">
          Voir tout
        </Link>
      </div>
      {loading || !clients ? (
        <div className="p-4">
          <SkeletonTable rows={5} cols={4} />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon="folder_open" title="Aucun client scoré" description="Lancez un premier scoring pour le voir apparaître ici." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.client_id} clickable onClick={() => router.push(`/clients/${c.client_id}`)}>
                <TableCell>
                  <AvatarNameRow firstName={c.profile.prenom} lastName={c.profile.nom} size="sm" />
                </TableCell>
                <TableCell className="font-mono">{c.last_score?.score_pdo ?? "—"}</TableCell>
                <TableCell>
                  <DecisionBadge decision={c.last_score?.decision} />
                </TableCell>
                <TableCell className="text-right text-on-surface-variant">{formatDateTime(c.last_score?.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
