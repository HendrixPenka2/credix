import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-container-high", className)} />;
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Squelette de carte générique (titre + valeur + ligne). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-outline-variant/60 p-card-padding space-y-3", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/** Squelette de grille de cartes stats (4 cartes par défaut). */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Squelette de tableau (n lignes × n colonnes). */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 overflow-hidden">
      <div className="bg-surface-container-low px-4 py-2.5 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-outline-variant/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-6 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-3", c === 0 ? "w-28" : "w-16")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Squelette de graphique (bloc rectangulaire). */
export function SkeletonChart({ className }: { className?: string }) {
  return <Skeleton className={cn("h-64 w-full", className)} />;
}

/** Squelette d'en-tête de profil (avatar + 2 lignes de texte) — cf. ClientHeader. */
export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
