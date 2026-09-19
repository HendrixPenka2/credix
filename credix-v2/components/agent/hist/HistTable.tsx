"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { RawFeaturesGrid } from "@/components/shared/RawFeaturesGrid";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { formatDateTime } from "@/lib/utils";
import type { ScoringHistoryItem } from "@/lib/types";

function DownloadPdfButton({ demandeId }: { demandeId: string }) {
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

export function HistTable({ historique }: { historique: ScoringHistoryItem[] }) {
  const sorted = [...historique].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const columns: DataTableColumn<ScoringHistoryItem>[] = [
    { header: "Date", cell: (h) => formatDateTime(h.timestamp) },
    { header: "Score PDO", cell: (h) => <span className="font-mono">{h.score_pdo}</span> },
    { header: "Décision", cell: (h) => <DecisionBadge decision={h.decision} /> },
    { header: "Couverture ρc", cell: (h) => `${Math.round(h.rho_c * 100)}%` },
    { header: "Rapport", cell: (h) => <DownloadPdfButton demandeId={h.demande_id} /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={sorted}
      getRowId={(h) => h.demande_id}
      emptyTitle="Aucun historique"
      emptyDescription="Ce client n'a pas encore été scoré."
      renderExpanded={(h) => (
        <div className="space-y-4 py-2">
          {h.declaratif && Object.keys(h.declaratif).length > 0 && (
            <div>
              <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Données de la demande</p>
              <RawFeaturesGrid data={h.declaratif} />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <ShapBlock items={h.shap_top5} />
            <AnomalyPanel data={h} />
          </div>
        </div>
      )}
    />
  );
}
