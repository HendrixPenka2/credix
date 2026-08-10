import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/design-tokens';
import { getDecisionStyle, getRhoStyle, getPsiStyle, psiStyleFromValue, getModelStatusStyle, getRoleStyle, getOutcomeStyle, getAnomalyStyle } from '@/lib/design-tokens';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
  brand: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

/** Badge générique par ton sémantique — base de tous les badges spécialisés ci-dessous. */
export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONE_CLASS[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function DecisionBadge({ decision, className }: { decision?: string | null; className?: string }) {
  const s = getDecisionStyle(decision);
  return <Badge tone={s.tone} className={className}>{s.label}</Badge>;
}

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
  return <Badge tone={s.tone} className={className}>{s.label.toUpperCase()}</Badge>;
}

export function ModelStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const s = getModelStatusStyle(status);
  return <Badge tone={s.tone} className={className}>{s.label}</Badge>;
}

export function RoleBadge({ role, className }: { role?: string | null; className?: string }) {
  const s = getRoleStyle(role);
  return <Badge tone={s.tone} className={className}>{s.label}</Badge>;
}

export function OutcomeBadge({ statut, className }: { statut?: string | null; className?: string }) {
  const s = getOutcomeStyle(statut);
  return <Badge tone={s.tone} className={className}>{s.label}</Badge>;
}

export function AnomalyBadge({ isAnomaly, className }: { isAnomaly?: boolean | null; className?: string }) {
  const s = getAnomalyStyle(isAnomaly);
  return <Badge tone={s.tone} className={className}>{s.label}</Badge>;
}
