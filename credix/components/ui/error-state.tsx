import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = "Une erreur est survenue lors du chargement.", onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-16', className)}>
      <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Impossible de charger les données</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          <RotateCcw className="w-3.5 h-3.5" />
          Réessayer
        </Button>
      )}
    </div>
  );
}
