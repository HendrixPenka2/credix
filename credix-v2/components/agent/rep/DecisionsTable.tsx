"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AnomalyBadge } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/shared/EmptyState";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { formatDateTime } from "@/lib/utils";
import type { MyDecisionItem } from "@/lib/types";

function DownloadCell({ demandeId }: { demandeId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={loading}
      onClick={async (e) => {
        e.stopPropagation();
        setLoading(true);
        try {
          const blob = await decisionsRepository.downloadPdf(demandeId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `rapport_${demandeId}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } finally {
          setLoading(false);
        }
      }}
    >
      <Icon name="download" size={16} />
      PDF
    </Button>
  );
}

export function DecisionsTable({ decisions }: { decisions: MyDecisionItem[] }) {
  const router = useRouter();

  if (decisions.length === 0) {
    return <EmptyState icon="description" title="Aucun rapport" description="Aucune décision produite sur cette période." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Décision</TableHead>
          <TableHead>Anomalie</TableHead>
          <TableHead className="text-right">Rapport</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {decisions.map((d) => (
          <TableRow key={d.demande_id} clickable onClick={() => router.push(`/clients/${d.client_id}`)}>
            <TableCell>
              <AvatarNameRow firstName={d.client_prenom} lastName={d.client_nom} subtitle={d.client_id} size="sm" />
            </TableCell>
            <TableCell className="text-on-surface-variant">{formatDateTime(d.timestamp)}</TableCell>
            <TableCell className="font-mono">{d.score_pdo}</TableCell>
            <TableCell>
              <DecisionBadge decision={d.decision_finale.valeur} />
            </TableCell>
            <TableCell>{d.is_anomaly && <AnomalyBadge isAnomaly={d.is_anomaly} />}</TableCell>
            <TableCell className="text-right">
              <DownloadCell demandeId={d.demande_id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
