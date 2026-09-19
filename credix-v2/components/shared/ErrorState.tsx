import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** État d'erreur générique — message + bouton "Réessayer" (cf. cdc_credix.md §6.7). */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-rose/10 text-danger-rose mb-4">
        <Icon name="error" size={32} />
      </span>
      <p className="font-headline-sm text-on-surface">Une erreur est survenue</p>
      <p className="font-body-sm text-on-surface-variant mt-1 max-w-sm">
        {message || "Impossible de charger les données. Vérifiez votre connexion et réessayez."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Réessayer
        </Button>
      )}
    </div>
  );
}
