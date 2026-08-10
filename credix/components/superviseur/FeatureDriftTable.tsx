'use client';

import { FeatureDrift } from '@/lib/types';
import { PsiBadge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props { drift: FeatureDrift; }

const PSI_MAX_DISPLAY = 0.50; // cap barre à 0.50 pour lisibilité

function psiBarColor(psi: number | null) {
  if (psi == null) return 'bg-slate-200 dark:bg-slate-700';
  if (psi < 0.10)  return 'bg-emerald-500';
  if (psi < 0.25)  return 'bg-amber-500';
  return 'bg-rose-500';
}

export function FeatureDriftTable({ drift }: Props) {
  const features = [...(drift.features ?? [])]
    .sort((a, b) => (b.psi ?? 0) - (a.psi ?? 0));

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-transparent hover:bg-transparent">
          {['#', 'Variable', 'PSI', 'Statut', 'Réf.', 'Actuels'].map(h => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((f, i) => {
          const barW = f.psi != null ? Math.min(f.psi / PSI_MAX_DISPLAY * 100, 100) : 0;
          return (
            <TableRow key={f.feature}>
              <TableCell className="text-xs font-mono w-8">{i + 1}</TableCell>
              <TableCell>
                <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200">{f.feature}</p>
              </TableCell>
              <TableCell className="w-48">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 w-12 shrink-0">
                    {f.psi != null ? f.psi.toFixed(4) : '—'}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', psiBarColor(f.psi))}
                      style={{ width: `${barW}%` }} />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <PsiBadge value={f.psi ?? undefined} statut={f.statut} />
              </TableCell>
              <TableCell className="text-xs font-mono">{f.nb_ref}</TableCell>
              <TableCell className="text-xs font-mono">{f.nb_act}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
