'use client';

import { Users, ShieldCheck, Layers, UploadCloud } from 'lucide-react';
import { ModelVersion } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';

interface Props {
  nbAgents: number;
  nbSuperviseurs: number;
  modeleProd?: ModelVersion;
  nbEnAttente: number;
}

export function AdminStatCards({ nbAgents, nbSuperviseurs, modeleProd, nbEnAttente }: Props) {
  const nomProd = modeleProd?.version ?? modeleProd?.nom_version;
  const auc = modeleProd?.metriques?.auc;

  const cards = [
    {
      label: 'Agents actifs', value: nbAgents,
      hint: 'comptes AGENT', icon: Users, tone: 'brand',
    },
    {
      label: 'Superviseurs actifs', value: nbSuperviseurs,
      hint: 'comptes SUPERVISEUR', icon: ShieldCheck, tone: 'success',
    },
    {
      label: 'Modèle en production', value: nomProd ?? '—',
      hint: auc != null ? `AUC ${auc.toFixed(4)}` : 'aucune métrique',
      icon: Layers, tone: 'brand',
    },
    {
      label: 'En attente de promotion', value: nbEnAttente,
      hint: nbEnAttente > 0 ? 'version(s) STAGING' : 'rien à promouvoir',
      icon: UploadCloud, tone: nbEnAttente > 0 ? 'warning' : 'neutral',
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
