import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Gabarit unique pour tous les états vides — une seule maquette
 * (recherche_clients_credix_agent) en montrait un ; ce composant généralise
 * son motif (icône cercle + titre + texte + CTA) à toute l'app.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-outline mb-4">
        <Icon name={icon} size={32} />
      </span>
      <p className="font-headline-sm text-on-surface">{title}</p>
      {description && <p className="font-body-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
