import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} />;
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Squelette de carte générique (titre + 2-3 lignes de contenu). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** Squelette de grille de cartes stats (4 cartes par défaut). */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Squelette de tableau (n lignes × n colonnes). */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-6 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-28' : 'w-16')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Squelette d'en-tête de profil (avatar + 2 lignes de texte). */
export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-full shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

/** Squelette de graphique (bloc rectangulaire). */
export function SkeletonChart({ className }: { className?: string }) {
  return <Skeleton className={cn('h-64 w-full', className)} />;
}
