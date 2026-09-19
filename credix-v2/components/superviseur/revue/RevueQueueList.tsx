import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { CoverageRing } from "@/components/shared/CoverageRing";
import { getDecisionStyle } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DecisionPendingReview } from "@/lib/types";

export function RevueQueueList({
  dossiers,
  selectedId,
  onSelect,
}: {
  dossiers: DecisionPendingReview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (dossiers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <Icon name="task_alt" size={32} className="text-success-emerald mb-2" />
        <p className="font-body-sm text-on-surface-variant">Aucun dossier dans cette file.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-variant/40">
      {dossiers.map((d) => {
        const active = d.demande_id === selectedId;
        const style = getDecisionStyle("REVUE_MANUELLE");
        return (
          <button
            key={d.demande_id}
            type="button"
            onClick={() => onSelect(d.demande_id)}
            className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active ? "bg-supervisor-violet/5" : "hover:bg-surface-container-low")}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-data-sm text-on-surface truncate">
                  {d.client_prenom} {d.client_nom}
                </p>
                {d.is_anomaly && (
                  <Badge tone="warning" className="shrink-0">
                    Interceptée
                  </Badge>
                )}
              </div>
              <p className="font-body-sm text-on-surface-variant truncate">{d.client_id}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[12px]", style.badge)}>
                {d.score_pdo}
              </span>
              <CoverageRing rho={d.rho_c} size={32} strokeWidth={4} showLabel={false} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
