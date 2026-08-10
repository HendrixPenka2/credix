'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckSquare, Gauge } from 'lucide-react';
import { OverrideStats, OverrideHistoryItem } from '@/lib/types';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';
import { OverrideDonut } from '@/components/superviseur/OverrideDonut';
import { OverrideHistoryTable } from '@/components/superviseur/OverrideHistoryTable';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

const INTERPRETATION_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Seuils bien calibrés':      { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-700/30' },
  'Seuils trop conservateurs': { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200/60 dark:border-amber-700/30' },
  'Seuils trop laxistes':      { bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-700 dark:text-rose-400',       border: 'border-rose-200/60 dark:border-rose-700/30' },
};

export default function MesValidationsPage() {
  const [stats, setStats]         = useState<OverrideStats | null>(null);
  const [overrides, setOverrides] = useState<OverrideHistoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      decisionsRepository.getOverrideStats(),
      decisionsRepository.getMyOverrides(50),
    ])
      .then(([s, o]) => { setStats(s); setOverrides(o.overrides); })
      .catch(() => setError('Impossible de charger vos statistiques. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const style = stats ? (INTERPRETATION_STYLE[stats.interpretation] ?? INTERPRETATION_STYLE['Seuils bien calibrés']) : null;

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <CheckSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Mes validations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Historique et calibration de vos décisions
          </p>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {/* ── Contenu ── */}
      {!loading && !error && stats && (
        <>
          {/* Bannière interprétation calibration */}
          {style && (
            <div className={cn('flex items-center gap-3 px-5 py-4 rounded-xl border', style.bg, style.border)}>
              <Gauge className={cn('w-5 h-5 shrink-0', style.text)} />
              <div>
                <p className={cn('text-sm font-semibold', style.text)}>{stats.interpretation}</p>
                <p className={cn('text-xs mt-0.5 opacity-80', style.text)}>
                  {stats.taux_accord_pct}% de vos dossiers tranchés ont été accordés.
                </p>
              </div>
            </div>
          )}

          {/* Métriques */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Dossiers en revue" value={stats.total_revue} hint="total historique" />
            <StatCard label="Dossiers tranchés" value={stats.total_overrides} hint={`${stats.taux_override_pct}% traités`} />
            <StatCard label="Taux d'accord" value={`${stats.taux_accord_pct}%`} hint="parmi vos décisions" tone="success" />
            <StatCard label="Désaccord modèle" value={`${stats.taux_desaccord_modele}%`} hint="REVUE → ACCORDÉ par vous" tone="warning" />
          </div>

          {/* Donut */}
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-1">
              <OverrideDonut stats={stats} />
            </div>
            <Card className="col-span-2 p-6">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">
                Comment lire ces chiffres
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Le <strong>taux d'accord</strong> mesure la proportion de dossiers en revue que vous avez
                finalement accordés. Un taux trop élevé (&gt;70%) suggère que les seuils du modèle sont
                trop conservateurs — il envoie en revue des dossiers qui auraient pu être accordés
                automatiquement. Un taux trop faible (&lt;30%) suggère l'inverse : les seuils sont trop
                laxistes et le modèle laisse passer en revue des dossiers à risque que vous refusez
                systématiquement.
              </p>
            </Card>
          </div>

          {/* Liste des dossiers validés */}
          <OverrideHistoryTable overrides={overrides} />
        </>
      )}
    </div>
  );
}
