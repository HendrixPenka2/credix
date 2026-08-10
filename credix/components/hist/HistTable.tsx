'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Loader2, ShieldAlert } from 'lucide-react';
import { HistoryItem, getDecisionVal } from '@/components/client/types';
import { ShapBar } from '@/components/Charts';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { formatPd, formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { DecisionBadge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface Props { history: HistoryItem[]; }

export function HistTable({ history }: Props) {
  const { toast } = useToast();
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  // Du plus récent au plus ancien
  const rows = [...history].reverse();

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handlePdf = async (e: React.MouseEvent, demandeId: string) => {
    e.stopPropagation();
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {history.length} scoring{history.length > 1 ? 's' : ''} — cliquez pour détailler
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Du plus récent au plus ancien</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-transparent hover:bg-transparent">
            {['Date', 'Score PDO', 'PD', 'Couverture ρc', 'Décision', 'Profil', ''].map(h => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item, idx) => {
            const key      = item.demande_id ?? `${item.timestamp}-${idx}`;
            const open     = expanded.has(key);
            const dec      = getDecisionVal(item.decision);
            const hasShap  = Array.isArray(item.shap_top5) && item.shap_top5.length > 0;
            const rhoStyle = getRhoStyle(item.rho_c);

            return (
              <React.Fragment key={key}>
                {/* ── Ligne principale ── */}
                <TableRow clickable onClick={() => toggle(key)}>
                  <TableCell>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white text-base">{item.score_pdo}</span>
                  </TableCell>
                  <TableCell className="text-sm">{formatPd(item.pd_c)}</TableCell>
                  <TableCell>
                    <span className={cn('text-sm font-semibold', rhoStyle.text)}>
                      {formatRho(item.rho_c)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <DecisionBadge decision={dec} />
                      {item.override_superviseur && (
                        <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                          ↪ Superviseur
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.is_anomaly ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="w-3.5 h-3.5" />Atypique
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {open
                      ? <ChevronDown className="w-4 h-4 text-slate-500 ml-auto transition-transform" />
                      : <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto" />}
                  </TableCell>
                </TableRow>

                {/* ── Ligne détail (expandée) ── */}
                {open && (
                  <TableRow className="bg-slate-50/70 dark:bg-slate-800/20 hover:bg-slate-50/70 dark:hover:bg-slate-800/20">
                    <TableCell colSpan={7} className="py-5">
                      <div className="space-y-4">
                        {hasShap ? (
                          <div>
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">
                              Facteurs déterminants
                            </p>
                            <div className="space-y-1">
                              {item.shap_top5!.map((s, i) => (
                                <ShapBar
                                  key={i}
                                  label={s.libelle_agent ?? s.feature}
                                  shap_value={s.shap_value}
                                  poids_pct={s.poids_pct}
                                  explication_naturelle={s.explication_naturelle}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Données explicatives non disponibles pour ce scoring.
                          </p>
                        )}

                        {/* PDF */}
                        {item.demande_id && (
                          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => handlePdf(e, item.demande_id!)}
                              loading={downloading === item.demande_id}
                            >
                              {downloading !== item.demande_id && <Download className="w-3.5 h-3.5" />}
                              {downloading === item.demande_id ? 'Génération…' : 'Télécharger le rapport PDF'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
