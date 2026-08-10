'use client';

import { CheckCircle2, AlertTriangle, XCircle, FileBarChart } from 'lucide-react';
import { DashboardStatistics } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';

interface Props { stats: DashboardStatistics; }

export function StatCards({ stats }: Props) {
  const accordPct = stats.par_decision?.ACCORDE?.pct ?? 0;
  const refusPct  = stats.par_decision?.REFUSE?.pct ?? 0;
  const revuePct  = stats.taux_revue_pct ?? 0;

  const cards = [
    {
      label: 'Dossiers scorés', value: stats.total_demandes, hint: 'au total sur la période',
      icon: FileBarChart, tone: 'brand',
    },
    {
      label: 'Accordés', value: stats.accordes, hint: `${accordPct}% des dossiers`,
      icon: CheckCircle2, tone: 'success',
    },
    {
      label: 'En revue', value: stats.revues, hint: `${revuePct}% des dossiers`,
      icon: AlertTriangle, tone: 'warning',
    },
    {
      label: 'Refusés', value: stats.refuses, hint: `${refusPct}% des dossiers`,
      icon: XCircle, tone: 'danger',
    },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(({ label, value, hint, icon, tone }) => (
        <StatCard key={label} label={label} value={value} hint={hint} icon={icon} tone={tone} />
      ))}
    </div>
  );
}
