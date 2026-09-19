import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ModelStatusBadge } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import type { ModelVersion } from "@/lib/types";

export function nomVersion(v: ModelVersion): string {
  return v.nom_version ?? v.version ?? v.run_id.slice(0, 8);
}

/** Carte de mise en avant de la version en PRODUCTION — cf. versions_du_mod_le_superviseur. */
export function ProductionHighlight({ version }: { version: ModelVersion }) {
  return (
    <Card className="p-card-padding relative overflow-hidden border-supervisor-violet/30">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-supervisor-violet/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <ModelStatusBadge status={version.statut} />
          {version.promoted_at && <span className="font-body-sm text-on-surface-variant">Active depuis {formatDate(version.promoted_at)}</span>}
        </div>
        <p className="font-display-lg text-on-surface mt-2">{nomVersion(version)}</p>
        {version.description && <p className="font-body-sm text-on-surface-variant mt-1">{version.description}</p>}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <MetricMini label="AUC" value={version.metriques?.auc} />
          <MetricMini label="Gini" value={version.metriques?.gini} />
          <MetricMini label="KS" value={version.metriques?.ks} />
        </div>
      </div>
    </Card>
  );
}

function MetricMini({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3">
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider">{label}</p>
      <p className="font-data-lg text-on-surface mt-1">{value != null ? value.toFixed(3) : "—"}</p>
    </div>
  );
}

export interface ModelVersionsTableProps {
  versions: ModelVersion[];
  renderActions?: (version: ModelVersion) => React.ReactNode;
}

/** Table d'historique des versions — partagée entre /superviseur/modele/versions (lecture seule) et /admin/modeles (actions). */
export function ModelVersionsTable({ versions, renderActions }: ModelVersionsTableProps) {
  if (versions.length === 0) {
    return <EmptyState icon="layers" title="Aucune version" description="Aucun modèle n'a encore été importé." />;
  }

  const sorted = [...versions].sort((a, b) => new Date(b.date_upload ?? 0).getTime() - new Date(a.date_upload ?? 0).getTime());

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date d&apos;activation</TableHead>
          <TableHead>AUC</TableHead>
          <TableHead>Gini</TableHead>
          <TableHead>KS</TableHead>
          <TableHead>Description</TableHead>
          {renderActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((v) => (
          <TableRow key={v.run_id} className={v.statut === "ARCHIVE" ? "opacity-70" : undefined}>
            <TableCell>
              <span className="flex items-center gap-2 font-data-sm text-on-surface">
                {v.statut === "PRODUCTION" && <span className="h-1.5 w-1.5 rounded-full bg-success-emerald" />}
                {nomVersion(v)}
              </span>
            </TableCell>
            <TableCell>
              <ModelStatusBadge status={v.statut} />
            </TableCell>
            <TableCell className="text-on-surface-variant">{v.promoted_at ? formatDate(v.promoted_at) : "--"}</TableCell>
            <TableCell className="font-mono">{v.metriques?.auc?.toFixed(3) ?? "—"}</TableCell>
            <TableCell className="font-mono">{v.metriques?.gini?.toFixed(3) ?? "—"}</TableCell>
            <TableCell className="font-mono">{v.metriques?.ks?.toFixed(3) ?? "—"}</TableCell>
            <TableCell className="text-on-surface-variant max-w-xs truncate" title={v.description}>
              {v.description ?? "—"}
            </TableCell>
            {renderActions && <TableCell className="text-right">{renderActions(v)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
