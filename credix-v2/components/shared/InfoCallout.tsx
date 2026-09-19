import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface InfoCalloutProps {
  icon?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Carte pédagogique sombre — référence : dérive PSI + configuration des
 * seuils. Toujours sombre (y compris en thème clair) pour se distinguer
 * visuellement du reste du contenu, cf. audit design cross-cutting.
 */
export function InfoCallout({ icon = "lightbulb", title, children, className }: InfoCalloutProps) {
  return (
    <div className={cn("rounded-xl bg-slate-900 text-white p-card-padding", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} filled className="text-supervisor-violet" />
        <p className="font-headline-sm">{title}</p>
      </div>
      <div className="font-body-sm text-slate-300 space-y-2">{children}</div>
    </div>
  );
}
