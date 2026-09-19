import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { OutcomeBadge } from "@/components/shared/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

export function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
  const columns: DataTableColumn<AuditLog>[] = [
    { header: "Horodatage", cell: (l) => formatDateTime(l.timestamp) },
    {
      header: "Utilisateur",
      cell: (l) => (
        <div>
          <p className="text-on-surface">{l.user_display_name || l.user_id}</p>
          <p className="font-body-sm text-on-surface-variant">{l.user_role}</p>
        </div>
      ),
    },
    { header: "Action", cell: (l) => <Badge tone="info">{l.action}</Badge> },
    { header: "Ressource", cell: (l) => <span className="font-mono text-on-surface-variant">{l.ressource}</span> },
    {
      header: "Statut",
      cell: (l) => (
        <span className="flex items-center gap-1.5">
          <Icon name={l.statut?.toUpperCase().startsWith("SUCC") ? "check_circle" : "error"} filled size={18} className={l.statut?.toUpperCase().startsWith("SUCC") ? "text-success-emerald" : "text-danger-rose"} />
          <OutcomeBadge statut={l.statut} />
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      getRowId={(l) => `${l.timestamp}-${l.ressource_id}-${l.action}-${l.user_id}`}
      emptyTitle="Aucune action"
      emptyDescription="Aucune entrée ne correspond à ces filtres."
      renderExpanded={(l) => (
        <div className="space-y-2">
          {l.ip_address && (
            <p className="font-mono text-xs text-on-surface-variant">
              <Icon name="desktop_windows" size={14} className="inline mr-1" />
              {l.ip_address}
            </p>
          )}
          <pre className="bg-slate-900 text-slate-300 font-mono text-[12px] p-3 rounded-lg overflow-x-auto">{JSON.stringify(l.details, null, 2)}</pre>
        </div>
      )}
    />
  );
}
