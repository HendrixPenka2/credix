import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  getRhoStyle,
  getPsiStyle,
  psiStyleFromValue,
  getModelStatusStyle,
  getRoleStyle,
  getOutcomeStyle,
  getAnomalyStyle,
} from "@/lib/design-tokens";

/** ρc — critique/partielle/suffisante. `showValue` affiche le % plutôt que le libellé. */
export function RhoBadge({ rho, showValue = true, className }: { rho: number; showValue?: boolean; className?: string }) {
  const s = getRhoStyle(rho);
  return (
    <Badge tone={s.tone} className={className}>
      {showValue ? `${Math.round(rho * 100)}%` : s.label}
    </Badge>
  );
}

export function PsiBadge({ value, statut, className }: { value?: number | null; statut?: string; className?: string }) {
  const s = statut ? getPsiStyle(statut) : psiStyleFromValue(value);
  return (
    <Badge tone={s.tone} className={className}>
      {s.label.toUpperCase()}
    </Badge>
  );
}

export function ModelStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const s = getModelStatusStyle(status);
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

/** Rôle utilisateur — 3 traitements distincts (voir getRoleStyle : solid/tinted/outline). */
export function RoleBadge({ role, className }: { role?: string | null; className?: string }) {
  const s = getRoleStyle(role);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 font-label-md text-[12px] font-semibold", s.badge, className)}>
      {s.label}
    </span>
  );
}

export function OutcomeBadge({ statut, className }: { statut?: string | null; className?: string }) {
  const s = getOutcomeStyle(statut);
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

/** Le score d'anomalie (Flux B) doit rester visible — voir AnomalyPanel pour le bloc complet. */
export function AnomalyBadge({ isAnomaly, className }: { isAnomaly?: boolean | null; className?: string }) {
  const s = getAnomalyStyle(isAnomaly);
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}
