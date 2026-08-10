import * as React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/design-tokens';

const ICON_TONE: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  brand: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  hint?: string;
  delta?: number; // % variation — flèche verte/rouge automatique
  className?: string;
}

/**
 * Carte de métrique unique — remplace le pattern répété partout dans le repo
 * (`bg-{couleur}-50 border rounded-xl p-4 text-center`). Utiliser CETTE
 * carte pour toute nouvelle statistique plutôt que de réimplémenter le style.
 */
export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, delta, className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', ICON_TONE[tone])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2 tabular-nums">{value}</p>
      {(hint || delta != null) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {delta != null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
