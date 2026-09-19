"use client";

import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { RhoBadge } from "@/components/shared/StatusPill";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { Icon } from "@/components/ui/icon";
import type { ClientSearchResult } from "@/lib/types";

export function ClientsTable({ clients }: { clients: ClientSearchResult[] }) {
  const router = useRouter();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Identifiant</TableHead>
          <TableHead>Emploi</TableHead>
          <TableHead>Couverture ρc</TableHead>
          <TableHead>Dernier score</TableHead>
          <TableHead>Décision</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((c) => (
          <TableRow key={c.client_id} clickable onClick={() => router.push(`/clients/${c.client_id}`)}>
            <TableCell>
              <AvatarNameRow firstName={c.profile.prenom} lastName={c.profile.nom} size="sm" />
            </TableCell>
            <TableCell className="font-mono text-on-surface-variant">{c.client_id}</TableCell>
            <TableCell>{c.profile.type_emploi ?? "—"}</TableCell>
            <TableCell>
              <RhoBadge rho={c.coverage.rho} />
            </TableCell>
            <TableCell className="font-mono">{c.last_score?.score_pdo ?? "—"}</TableCell>
            <TableCell>
              <DecisionBadge decision={c.last_score?.decision} />
            </TableCell>
            <TableCell>
              <Icon name="chevron_right" size={18} className="text-outline" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
