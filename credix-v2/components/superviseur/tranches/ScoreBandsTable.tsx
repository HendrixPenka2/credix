import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatPd } from "@/lib/utils";
import type { ScoreBands } from "@/lib/types";

export function ScoreBandsTable({ tranches }: { tranches: ScoreBands["tranches"] }) {
  const sorted = [...tranches].sort((a, b) => b.borne_inf - a.borne_inf);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tranche</TableHead>
          <TableHead>Dossiers</TableHead>
          <TableHead>% Portefeuille</TableHead>
          <TableHead>PD moyenne</TableHead>
          <TableHead>Score moyen</TableHead>
          <TableHead>ρc moyen</TableHead>
          <TableHead>Répartition</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((t) => {
          const total = t.nb_accordes + t.nb_refuses + t.nb_revues || 1;
          return (
            <TableRow key={t.libelle}>
              <TableCell className="font-data-sm text-on-surface">{t.libelle}</TableCell>
              <TableCell className="font-mono">{t.count}</TableCell>
              <TableCell className="font-mono">{t.pct_portfolio.toFixed(1)}%</TableCell>
              <TableCell className="font-mono">{formatPd(t.pd_moyenne)}</TableCell>
              <TableCell className="font-mono">{Math.round(t.score_moyen)}</TableCell>
              <TableCell className="font-mono">{Math.round(t.rho_moyen * 100)}%</TableCell>
              <TableCell>
                <div className="flex h-2 w-32 overflow-hidden rounded-full">
                  <div className="bg-success-emerald" style={{ width: `${(t.nb_accordes / total) * 100}%` }} />
                  <div className="bg-warning-amber" style={{ width: `${(t.nb_revues / total) * 100}%` }} />
                  <div className="bg-danger-rose" style={{ width: `${(t.nb_refuses / total) * 100}%` }} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
