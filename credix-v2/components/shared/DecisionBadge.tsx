import { Badge } from "@/components/ui/badge";
import { getDecisionStyle } from "@/lib/design-tokens";

/** ACCORDÉ / REFUSÉ / REVUE_MANUELLE — badge le plus répété de toute l'app. */
export function DecisionBadge({ decision, className }: { decision?: string | null; className?: string }) {
  const s = getDecisionStyle(decision);
  return (
    <Badge tone={s.tone} className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </Badge>
  );
}
