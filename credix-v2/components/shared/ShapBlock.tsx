import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { ShapItem } from "@/lib/types";

function barWidthPct(item: ShapItem, maxAbs: number): number {
  if (item.poids_pct != null) return Math.min(100, Math.abs(item.poids_pct));
  if (!maxAbs) return 0;
  return Math.min(100, (Math.abs(item.shap_value) / maxAbs) * 100);
}

/**
 * Bloc explicatif SHAP complet — un facteur par ligne, barre "waterfall"
 * poussant depuis la gauche (facteur atténuant, emerald) ou depuis la droite
 * (facteur aggravant, rose), plus la phrase en langage naturel. Référence :
 * file_de_revue_d_taill_e_superviseur + nouveau_scoring_r_sultat_credix_agent.
 */
export function ShapBlock({ items, className }: { items: ShapItem[]; className?: string }) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.shap_value)), 0);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, i) => {
        const isAggravant = item.direction === "aggravant";
        const width = barWidthPct(item, maxAbs);
        return (
          <div key={`${item.feature}-${i}`} className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isAggravant ? "bg-danger-rose/10 text-danger-rose" : "bg-success-emerald/10 text-success-emerald"
                )}
              >
                <Icon name={isAggravant ? "add" : "remove"} size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-data-sm text-on-surface">{item.libelle_agent}</p>
                  <span className={cn("font-mono text-[11px]", isAggravant ? "text-danger-rose" : "text-success-emerald")}>
                    {isAggravant ? "-" : "+"}
                    {item.poids_pct != null ? `${Math.round(Math.abs(item.poids_pct))}%` : Math.abs(item.shap_value).toFixed(2)}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-outline mt-0.5">{item.feature}</p>
                <div className="h-1.5 w-full rounded-full bg-outline-variant/30 mt-2 overflow-hidden flex">
                  {!isAggravant && (
                    <div className="h-full rounded-full bg-success-emerald" style={{ width: `${width}%` }} />
                  )}
                  {isAggravant && <div className="flex-1" />}
                  {isAggravant && <div className="h-full rounded-full bg-danger-rose ml-auto" style={{ width: `${width}%` }} />}
                </div>
                <p className="font-body-sm text-on-surface-variant mt-2">{item.explication_naturelle}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Variante compacte (chip inline) — cellules de tableau (historique, audit). */
export function ShapChip({ item }: { item: ShapItem }) {
  const isAggravant = item.direction === "aggravant";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px]",
        isAggravant ? "border-danger-rose/30 text-danger-rose" : "border-success-emerald/30 text-success-emerald"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isAggravant ? "bg-danger-rose" : "bg-success-emerald")} />
      {item.libelle_agent}
      <span>
        {isAggravant ? "-" : "+"}
        {Math.abs(item.shap_value).toFixed(2)}
      </span>
    </span>
  );
}
