'use client';

import { FileBarChart, Percent, FileWarning, Inbox } from 'lucide-react';
import { PortfolioRisk } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';

interface Props { risk: PortfolioRisk; enAttente: number; }

export function PortfolioStats({ risk, enAttente }: Props) {
  const cards = [
    {
      label: 'Dossiers scorés', value: risk.nb_dossiers_scores,
      hint: 'sur la période', icon: FileBarChart, tone: 'brand',
    },
    {
      label: 'PD moyenne', value: risk.pd_moyenne != null ? `${(risk.pd_moyenne * 100).toFixed(1)}%` : '—',
      hint: risk.pd_mediane != null ? `médiane : ${(risk.pd_mediane * 100).toFixed(1)}%` : 'probabilité de défaut',
      icon: Percent, tone: 'brand',
    },
    {
      label: 'Taux thin-file', value: `${risk.taux_thin_file_pct}%`,
      hint: 'ρc < seuil bannière', icon: FileWarning, tone: 'warning',
    },
    {
      label: 'En attente revue', value: enAttente,
      hint: 'à trancher maintenant', icon: Inbox, tone: 'danger',
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
