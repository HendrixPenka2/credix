'use client';

import { useState, useEffect } from 'react';
import { Loader2, Layers, CheckCircle2, Inbox } from 'lucide-react';
import { ModelVersion } from '@/lib/types';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { ModelStatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function VersionsPage() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    monitoringRepository.getModelVersions()
      .then((res: any) => setVersions(res?.versions ?? []))
      .catch(() => setError('Impossible de charger les versions. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const prod = versions.find(v => v.statut === 'PRODUCTION');

  const fmt = (v: number | null | undefined) =>
    v != null ? v.toFixed(4) : '—';

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <Layers className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Versions du modèle</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Historique des versions — lecture seule (promotion réservée à l'admin)
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {!loading && !error && (
        <>
          {/* Modèle en production — mise en avant */}
          {prod && (
            <div className="flex items-start gap-4 px-5 py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="grid grid-cols-4 gap-6 flex-1">
                <div>
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">En production</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">{prod.version}</p>
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

          {/* Tableau de toutes les versions */}
          {versions.length === 0 ? (
            <Card><EmptyState icon={Inbox} title="Aucune version disponible" /></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-transparent hover:bg-transparent">
                  {['Version', 'Statut', 'AUC', 'Gini', 'KS', 'Entraîné le', 'Promu le'].map(h => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map(v => (
                  <TableRow key={v.run_id} className={cn(v.statut === 'PRODUCTION' && 'bg-emerald-50/30 dark:bg-emerald-900/10')}>
                    <TableCell>
                      <p className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">{v.version}</p>
                      <code className="text-[10px] text-slate-400 dark:text-slate-500">{v.run_id?.slice(0, 8)}…</code>
                    </TableCell>
                    <TableCell>
                      <ModelStatusBadge status={v.statut} />
                    </TableCell>
                    <TableCell className="text-sm font-mono font-semibold">
                      {fmt(v.metriques?.auc)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {fmt(v.metriques?.gini)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {fmt(v.metriques?.ks)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.date_entrainement
                        ? new Date(v.date_entrainement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.promoted_at
                        ? new Date(v.promoted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Vue lecture seule — la promotion d'une version STAGING vers PRODUCTION est réservée à l'admin.
          </p>
        </>
      )}
    </div>
  );
}
