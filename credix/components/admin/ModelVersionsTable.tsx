'use client';

import { Inbox, CheckCircle2, Rocket } from 'lucide-react';
import { ModelVersion } from '@/lib/types';
import { ModelStatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  versions: ModelVersion[];
  onPromote: (version: ModelVersion) => void;
}

const fmt = (v: number | null | undefined) => (v != null ? v.toFixed(4) : '—');

const nomVersion = (v: ModelVersion) => v.version ?? v.nom_version ?? '—';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ModelVersionsTable({ versions, onPromote }: Props) {
  const prod = versions.find(v => v.statut === 'PRODUCTION');

  if (versions.length === 0) {
    return <EmptyState icon={Inbox} title="Aucune version disponible" />;
  }

  return (
    <div className="space-y-5">
      {prod && (
        <div className="flex items-start gap-4 px-5 py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">En production</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{nomVersion(prod)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">AUC</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{fmt(prod.metriques?.auc)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Gini</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{fmt(prod.metriques?.gini)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">KS</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{fmt(prod.metriques?.ks)}</p>
            </div>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="bg-transparent hover:bg-transparent">
            {['Version', 'Statut', 'AUC', 'Gini', 'KS', 'Entraîné le', 'Promu le', ''].map(h => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map(v => (
            <TableRow key={v.run_id} className={cn(v.statut === 'PRODUCTION' && 'bg-emerald-50/30 dark:bg-emerald-900/10')}>
              <TableCell>
                <p className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">{nomVersion(v)}</p>
                <code className="text-[10px] text-slate-400 dark:text-slate-500">{v.run_id?.slice(0, 8)}…</code>
              </TableCell>
              <TableCell><ModelStatusBadge status={v.statut} /></TableCell>
              <TableCell className="text-sm font-mono font-semibold">{fmt(v.metriques?.auc)}</TableCell>
              <TableCell className="text-sm font-mono">{fmt(v.metriques?.gini)}</TableCell>
              <TableCell className="text-sm font-mono">{fmt(v.metriques?.ks)}</TableCell>
              <TableCell className="text-sm">{fmtDate(v.date_entrainement)}</TableCell>
              <TableCell className="text-sm">
                {v.promoted_at ? fmtDate(v.promoted_at) : <span className="text-slate-300 dark:text-slate-600">—</span>}
              </TableCell>
              <TableCell className="text-right">
                {v.statut !== 'PRODUCTION' && (
                  <Button size="sm" variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/30 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => onPromote(v)}>
                    <Rocket className="w-3.5 h-3.5" />Promouvoir
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
