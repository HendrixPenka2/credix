'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScoreBands } from '@/lib/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props { bands: ScoreBands; }

function bandColor(borne: number, seuilRefus: number, seuilAccord: number) {
  if (borne >= seuilAccord)              return { bg: 'bg-emerald-50 dark:bg-emerald-900/15', text: 'text-emerald-700 dark:text-emerald-400', bar: '#10b981' };
  if (borne >= seuilAccord - 50)         return { bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-500', bar: '#34d399' };
  if (borne >= seuilRefus)               return { bg: 'bg-amber-50 dark:bg-amber-900/15', text: 'text-amber-700 dark:text-amber-400', bar: '#f59e0b' };
  if (borne >= seuilRefus - 50)          return { bg: 'bg-amber-50/50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-500', bar: '#fbbf24' };
  return { bg: 'bg-rose-50 dark:bg-rose-900/15', text: 'text-rose-700 dark:text-rose-400', bar: '#f43f5e' };
}

function pdColor(pd: number) {
  if (pd < 0.10) return 'text-emerald-600 dark:text-emerald-400';
  if (pd < 0.25) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function finenessOk(tranches: ScoreBands['tranches']) {
  for (let i = 1; i < tranches.length; i++) {
    if (tranches[i].pd_moyenne > tranches[i - 1].pd_moyenne + 0.02) return false;
  }
  return true;
}

export function ScoreBandsTable({ bands }: Props) {
  const { refuse: sR, accorde: sA } = bands.seuils_pdo;
  const ok = finenessOk(bands.tranches);

  return (
    <div className="space-y-4">
      {/* Fineness test */}
      {ok ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Fineness test OK — la PD décroît bien à mesure que le score monte (calibration correcte)
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Fineness test — une inversion PD détectée entre deux tranches. Calibration du modèle à vérifier.
          </p>
        </div>
      )}

      {/* Tableau */}
      <Table>
        <TableHeader>
          <TableRow className="bg-transparent hover:bg-transparent">
            {['Tranche', 'Dossiers', '% portef.', 'PD moy.', 'Score moy.', 'ρc moy.', 'Accordés', 'Revues', 'Refusés'].map(h => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bands.tranches.map(t => {
            const { bg, text, bar } = bandColor(t.borne_inf, sR, sA);
            const barW = Math.min(t.pct_portfolio * 2, 100);
            return (
              <TableRow key={t.borne_inf} className={cn(bg, 'hover:brightness-95 dark:hover:brightness-110')}>
                <TableCell>
                  <p className={cn('text-xs font-semibold', text)}>{t.libelle}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{t.count}</span>
                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${barW}%`, background: bar }} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{t.pct_portfolio}%</TableCell>
                <TableCell className={cn('text-sm font-semibold font-mono', pdColor(t.pd_moyenne))}>{(t.pd_moyenne * 100).toFixed(1)}%</TableCell>
                <TableCell className="text-sm font-mono">{Math.round(t.score_moyen)}</TableCell>
                <TableCell className="text-sm font-mono">{(t.rho_moyen * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t.nb_accordes}</TableCell>
                <TableCell className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t.nb_revues}</TableCell>
                <TableCell className="text-sm font-semibold text-rose-600 dark:text-rose-400">{t.nb_refuses}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
