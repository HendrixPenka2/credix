'use client';

import { useState } from 'react';
import { Download, ShieldAlert, Inbox } from 'lucide-react';
import { MyDecisionItem } from '@/lib/types';
import { DecisionBadge } from '@/components/ui/badge';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { formatPd, formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface Props { decisions: MyDecisionItem[]; }

export function DecisionsTable({ decisions }: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handlePdf = async (demandeId: string) => {
    setDownloading(demandeId);
    try {
      const blob = await decisionsRepository.downloadPdf(demandeId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `rapport-${demandeId}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'error', title: 'Erreur lors du téléchargement PDF' });
    } finally {
      setDownloading(null);
    }
  };

  if (decisions.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Aucune décision sur cette période"
        description="Vos rapports apparaîtront ici après votre premier scoring."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-transparent hover:bg-transparent">
          {['Date', 'Client', 'Score PDO', 'PD', 'ρc', 'Décision', 'Profil', ''].map(h => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {decisions.map(d => {
          const rhoStyle = getRhoStyle(d.rho_c);
          return (
            <TableRow key={d.demande_id}>
              <TableCell>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {new Date(d.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(d.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {d.client_prenom} {d.client_nom}
                </p>
                <code className="text-[10px] text-slate-400 dark:text-slate-500">{d.client_id}</code>
              </TableCell>
              <TableCell>
                <span className="font-mono font-semibold text-slate-900 dark:text-white text-base">{d.score_pdo}</span>
              </TableCell>
              <TableCell className="text-sm">{formatPd(d.pd_c)}</TableCell>
              <TableCell>
                <span className={cn('text-sm font-semibold', rhoStyle.text)}>
                  {formatRho(d.rho_c)}
                </span>
              </TableCell>
              <TableCell>
                <DecisionBadge decision={d.decision_finale.valeur} />
              </TableCell>
              <TableCell>
                {d.is_anomaly ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-3.5 h-3.5" />Atypique
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePdf(d.demande_id)}
                  loading={downloading === d.demande_id}
                >
                  {downloading !== d.demande_id && <Download className="w-3.5 h-3.5" />}
                  PDF
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
