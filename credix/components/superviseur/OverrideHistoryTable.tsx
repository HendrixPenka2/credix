'use client';

import { Inbox } from 'lucide-react';
import { OverrideHistoryItem } from '@/lib/types';
import { EmptyState } from '@/components/ui/empty-state';
import { DecisionBadge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Props { overrides: OverrideHistoryItem[]; }

export function OverrideHistoryTable({ overrides }: Props) {
  if (overrides.length === 0) {
    return <EmptyState icon={Inbox} title="Aucun dossier validé pour le moment" />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 px-1">
        Dossiers validés ({overrides.length})
      </p>
      <Table>
        <TableHeader>
          <TableRow className="bg-transparent hover:bg-transparent">
            {['Date', 'Client', 'Score', 'Décision', 'Commentaire'].map(h => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map(o => (
            <TableRow key={o.demande_id}>
              <TableCell className="text-sm">
                {new Date(o.override_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </TableCell>
              <TableCell>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {o.client_prenom} {o.client_nom}
                </p>
                <code className="text-[10px] text-slate-400 dark:text-slate-500">{o.client_id}</code>
              </TableCell>
              <TableCell className="font-mono font-semibold text-slate-900 dark:text-white">{o.score_pdo}</TableCell>
              <TableCell>
                <DecisionBadge decision={o.decision_finale?.valeur} />
              </TableCell>
              <TableCell className="text-xs max-w-xs truncate" title={o.commentaire_superviseur}>
                {o.commentaire_superviseur}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
