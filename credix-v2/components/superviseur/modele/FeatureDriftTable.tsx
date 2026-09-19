import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PsiBadge } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { psiStyleFromValue } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { FeatureDrift } from "@/lib/types";

/** ~27 variables triées par PSI décroissant — cf. d_rive_par_variable_credix_ai. */
export function FeatureDriftTable({ features }: { features: FeatureDrift["features"] }) {
  if (features.length === 0) {
    return <EmptyState icon="tune" title="Aucune variable analysée" description="Pas assez de données pour calculer la dérive par variable." />;
  }

  const sorted = [...features].sort((a, b) => (b.psi ?? -1) - (a.psi ?? -1));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Variable</TableHead>
          <TableHead>PSI</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Éch. référence</TableHead>
          <TableHead>Éch. actuel</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((f) => {
          const style = psiStyleFromValue(f.psi);
          const isCritical = f.statut?.toUpperCase() === "DERIVE" || f.statut?.toUpperCase() === "DÉRIVE";
          const pct = f.psi != null ? Math.min(100, (f.psi / 0.5) * 100) : 0;
          return (
            <TableRow key={f.feature} className={isCritical ? "bg-danger-rose/5" : undefined}>
              <TableCell className={cn("font-mono", isCritical && "font-semibold text-on-surface")}>{f.feature}</TableCell>
              <TableCell>
                {f.psi != null ? (
                  <div className="flex items-center gap-2 w-40">
                    <span className="font-mono text-on-surface w-12">{f.psi.toFixed(3)}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-outline-variant/30 overflow-hidden">
                      <div className={cn("h-full rounded-full", style.dot)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="text-outline">—</span>
                )}
              </TableCell>
              <TableCell>
                <PsiBadge statut={f.statut} value={f.psi} />
              </TableCell>
              <TableCell className="text-on-surface-variant">{f.nb_ref}</TableCell>
              <TableCell className="text-on-surface-variant">{f.nb_act}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
