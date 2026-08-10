'use client';

import { useState, Fragment } from 'react';
import { Inbox, ChevronDown, ChevronRight } from 'lucide-react';
import { AuditLog } from '@/lib/types';
import { RoleBadge, OutcomeBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Props { logs: AuditLog[]; }

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function AuditLogsTable({ logs }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (logs.length === 0) {
    return <EmptyState icon={Inbox} title="Aucune entrée ne correspond aux filtres" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-transparent hover:bg-transparent">
          {['', 'Horodatage', 'Utilisateur', 'Rôle', 'Action', 'Ressource', 'Statut'].map(h => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log, i) => (
          <Fragment key={i}>
            <TableRow clickable onClick={() => setExpanded(expanded === i ? null : i)}>
              <TableCell className="text-slate-300 dark:text-slate-600">
                {expanded === i ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(log.timestamp)}</TableCell>
              <TableCell className="text-xs font-mono">{log.user_id}</TableCell>
              <TableCell><RoleBadge role={log.user_role} /></TableCell>
              <TableCell className="text-xs font-semibold">{log.action}</TableCell>
              <TableCell>
                <p className="text-xs">{log.ressource}</p>
                <code className="text-[10px] text-slate-400 dark:text-slate-500">{log.ressource_id}</code>
              </TableCell>
              <TableCell><OutcomeBadge statut={log.statut} /></TableCell>
            </TableRow>
            {expanded === i && (
              <TableRow className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <TableCell colSpan={7}>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Détails</p>
                  <pre className="text-[11px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap break-all bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    {log.ip_address && `ip: ${log.ip_address}\n`}
                    {JSON.stringify(log.details ?? {}, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
