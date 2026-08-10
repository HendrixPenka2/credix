'use client';

import { User, FileText } from 'lucide-react';
import { DecisionPendingReview } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface Props { dossier: DecisionPendingReview; }

const LABELS_DECLARATIF: Record<string, string> = {
  type_contrat: 'Type de contrat',
  montant_credit_demande: 'Montant crédit demandé',
  montant_annuite: 'Montant annuité',
  valeur_bien: 'Valeur du bien',
};

function fmtVal(v: unknown): string {
  if (typeof v === 'number') return v.toLocaleString('fr-FR');
  return String(v ?? '—');
}

export function RevueProfilCard({ dossier }: Props) {
  const p = dossier.client_profile;
  const d = dossier.declaratif;

  if (!p && !d) return null;

  const chips = p ? [
    { label: 'Genre', val: p.genre },
    { label: 'Situation', val: p.situation_familiale },
    { label: 'Enfants', val: p.nb_enfants },
    { label: 'Emploi', val: p.type_emploi },
    { label: 'Revenu', val: p.type_revenu },
    { label: 'Éducation', val: p.niveau_education },
  ].filter(c => c.val != null && c.val !== '') : [];

  return (
    <div className="grid grid-cols-2 gap-5">

      {/* Profil emprunteur */}
      {chips.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Profil emprunteur
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map(c => (
              <span key={c.label} className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-slate-400 dark:text-slate-500">{c.label}:</span> {String(c.val)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Données de la demande */}
      {d && Object.keys(d).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Données de la demande
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(d).map(([k, v]) => (
              <div key={k} className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{LABELS_DECLARATIF[k] ?? k}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{fmtVal(v)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
