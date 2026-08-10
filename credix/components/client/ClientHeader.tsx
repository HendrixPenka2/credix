'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, FlaskConical, Pencil, User, Briefcase, TrendingUp, GraduationCap, Users, Phone, Building2, CheckCircle, AlertTriangle, Clock, CircleCheck, CircleX } from 'lucide-react';
import { Client } from '@/lib/types';
import { formatRho } from '@/lib/utils';
import { ModifierProfilModal } from './ModifierProfilModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Props {
  client: Client;
  onRefetch?: () => void;
}

function ProfileChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/50">
      <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{label}</p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function RhoIndicator({ rho, hasHistory }: { rho: number; hasHistory: boolean }) {
  if (!hasHistory && rho === 0)
    return <span className="text-xs text-slate-400 dark:text-slate-500">ρc non calculé</span>;
  if (rho < 0.25)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400"><AlertTriangle className="w-3.5 h-3.5" />ρc {formatRho(rho)} — Critique</span>;
  if (rho < 0.40)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"><Clock className="w-3.5 h-3.5" />ρc {formatRho(rho)} — Partiel</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3.5 h-3.5" />ρc {formatRho(rho)} — Bon</span>;
}

export function ClientHeader({ client, onRefetch = () => {} }: Props) {
  const { profile, coverage, client_id, is_new_client } = client;
  const rho = coverage?.rho ?? 0;
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="p-6 space-y-5">

        {/* ── Ligne principale ── */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <InitialsAvatar firstName={profile.prenom} lastName={profile.nom} className="w-14 h-14 text-lg shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{profile.prenom} {profile.nom}</h1>
              {is_new_client && <Badge tone="brand">Nouveau client</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{client_id}</code>
              <RhoIndicator rho={rho} hasHistory={coverage?.has_history ?? false} />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <ProfileChip icon={User}          label="Genre"     value={profile.genre} />
              <ProfileChip icon={Briefcase}     label="Emploi"    value={profile.type_emploi} />
              <ProfileChip icon={TrendingUp}    label="Revenu"    value={profile.type_revenu} />
              <ProfileChip icon={GraduationCap} label="Éducation" value={profile.niveau_education} />
              <ProfileChip icon={Users}         label="Situation" value={profile.situation_familiale} />
              <ProfileChip icon={Users}         label="Enfants"   value={profile.nb_enfants} />
              <ProfileChip icon={Phone}         label="Téléphone" value={profile.telephone} />
              <ProfileChip icon={Building2}     label="Agence"    value={profile.agence_saisie} />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button asChild>
              <Link href={`/score?client_id=${client_id}`}><Zap className="w-4 h-4" />Nouveau scoring</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/simul?client_id=${client_id}`}><FlaskConical className="w-4 h-4" />Simuler</Link>
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <Pencil className="w-4 h-4" />Modifier
            </Button>
          </div>
        </div>

        {/* ── Sources (séparées clairement) ── */}
        {(coverage?.sources_disponibles?.length > 0 || coverage?.sources_manquantes?.length > 0) && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coverage.sources_disponibles?.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-500 mb-2">
                  <CircleCheck className="w-3.5 h-3.5" />Sources disponibles ({coverage.sources_disponibles.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.sources_disponibles.map(s => (
                    <span key={s} className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/30 rounded-md font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {coverage.sources_manquantes?.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 dark:text-rose-400 mb-2">
                  <CircleX className="w-3.5 h-3.5" />Sources manquantes ({coverage.sources_manquantes.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.sources_manquantes.map(s => (
                    <span key={s} className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-700/30 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {modalOpen && (
        <ModifierProfilModal
          client={client}
          onClose={() => setModalOpen(false)}
          onSuccess={onRefetch}
        />
      )}
    </>
  );
}
