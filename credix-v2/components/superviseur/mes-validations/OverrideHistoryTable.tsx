"use client";

import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import type { OverrideHistoryItem } from "@/lib/types";

export function OverrideHistoryTable({ overrides }: { overrides: OverrideHistoryItem[] }) {
  const router = useRouter();

  if (overrides.length === 0) {
    return <EmptyState icon="history" title="Aucune décision" description="Vous n'avez pas encore tranché de dossier en revue." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Ma décision</TableHead>
          <TableHead>Justification</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overrides.map((o) => (
          <TableRow key={o.demande_id} clickable onClick={() => router.push(`/clients/${o.client_id}`)}>
            <TableCell className="text-on-surface-variant">{formatDateTime(o.override_at)}</TableCell>
            <TableCell>
              <AvatarNameRow firstName={o.client_prenom} lastName={o.client_nom} subtitle={o.client_id} size="sm" />
            </TableCell>
            <TableCell className="font-mono">{o.score_pdo}</TableCell>
            <TableCell>
              <DecisionBadge decision={o.decision_finale.valeur} />
            </TableCell>
            <TableCell className="text-on-surface-variant max-w-sm truncate italic" title={o.commentaire_superviseur}>
              {o.commentaire_superviseur}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
