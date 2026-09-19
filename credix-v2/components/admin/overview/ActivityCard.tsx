import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

/** Activité récente — dérivée du vrai journal d'audit (pas une métrique fictive). */
export function ActivityCard({ total, lastLogs }: { total: number; lastLogs: AuditLog[] }) {
  return (
    <Card className="p-card-padding h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Activité récente</CardTitle>
        <Link href="/admin/audit" className="font-body-sm text-secondary hover:underline">
          Journal complet
        </Link>
      </div>
      <p className="font-data-lg text-on-surface">{total.toLocaleString("fr-FR")}</p>
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-4">Actions journalisées</p>
      <div className="space-y-2 flex-1">
        {lastLogs.slice(0, 5).map((log, i) => (
          <div key={i} className="flex items-center justify-between font-body-sm py-1.5 border-b border-outline-variant/40 last:border-0">
            <span className="flex items-center gap-2 text-on-surface-variant">
              <Icon name="bolt" size={14} />
              {log.action}
            </span>
            <span className="text-on-surface-variant">{formatDateTime(log.timestamp)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
