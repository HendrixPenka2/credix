import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type BannerVariant = "info" | "warning" | "critical" | "readonly" | "success";

const VARIANT_META: Record<BannerVariant, { icon: string; classes: string; iconClasses: string }> = {
  info: { icon: "info", classes: "bg-secondary/5 border-secondary/20", iconClasses: "text-secondary" },
  warning: { icon: "warning", classes: "bg-warning-amber/5 border-warning-amber/20", iconClasses: "text-warning-amber" },
  critical: { icon: "error", classes: "bg-danger-rose/5 border-danger-rose/20", iconClasses: "text-danger-rose" },
  readonly: { icon: "visibility", classes: "bg-supervisor-violet/5 border-supervisor-violet/20", iconClasses: "text-supervisor-violet" },
  success: { icon: "check_circle", classes: "bg-success-emerald/5 border-success-emerald/20", iconClasses: "text-success-emerald" },
};

export interface BannerProps {
  variant: BannerVariant;
  title: string;
  description?: string;
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Bandeau contextuel générique — lecture seule, action critique, anomalie
 * détectée, alerte portefeuille, etc. (cf. cdc_credix.md §6.7 : succès/erreur
 * doivent avoir un bandeau/toast, aucune maquette Stitch n'en avait de
 * réutilisable, donc conçu net-new à partir des variantes ponctuelles vues
 * dans les mockups).
 */
export function Banner({ variant, title, description, icon, className, children }: BannerProps) {
  const meta = VARIANT_META[variant];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", meta.classes, className)}>
      <Icon name={icon ?? meta.icon} filled className={cn("shrink-0 mt-0.5", meta.iconClasses)} />
      <div className="flex-1 min-w-0">
        <p className="font-data-sm text-on-surface">{title}</p>
        {description && <p className="font-body-sm text-on-surface-variant mt-0.5">{description}</p>}
        {children}
      </div>
    </div>
  );
}

/** Bandeau permanent de mode simulation — full-width, non fermable (cf. simulateur_what_if_credix_agent). */
export function SimulationBanner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 bg-simulation-orange text-white py-2 px-4 font-label-md uppercase tracking-wider", className)}>
      <Icon name="science" size={18} />
      Résultat non enregistré — mode simulation
    </div>
  );
}
