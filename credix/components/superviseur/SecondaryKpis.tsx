'use client';

import { TrendingUp, CheckCircle2, ShieldAlert, CheckSquare } from 'lucide-react';
import { PortfolioRisk, AnomalyStatistics, OverrideStats } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';

interface Props {
  risk: PortfolioRisk;
  anomaly: AnomalyStatistics | null;
  overrideStats: OverrideStats | null;
}

export function SecondaryKpis({ risk, anomaly, overrideStats }: Props) {
  const total  = Object.values(risk.distribution ?? {}).reduce((a, b) => a + b, 0);
  const accorde = risk.distribution?.['ACCORDE'] ?? 0;
  const tauxAccord = total > 0 ? Math.round(accorde / total * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Score moyen"
        value={risk.score_moyen != null ? Math.round(risk.score_moyen) : '—'}
        hint="sur 850 · portefeuille"
        icon={TrendingUp} tone="brand"
      />
      <StatCard
        label="Taux d'accord global"
        value={`${tauxAccord}%`}
        hint={`${accorde} accordé${accorde > 1 ? 's' : ''} sur ${total} dossiers`}
        icon={CheckCircle2} tone="success"
      />
      <StatCard
        label="Dossiers interceptés"
        value={anomaly?.nb_escalades ?? '—'}
        hint="accord initial → revue forcée"
        icon={ShieldAlert} tone="danger"
      />
      <StatCard
        label="Mes validations"
        value={overrideStats?.total_overrides ?? '—'}
        hint={overrideStats ? `${overrideStats.taux_accord_pct}% accordés` : 'dossiers tranchés par moi'}
        icon={CheckSquare} tone="warning"
      />
    </div>
  );
}
