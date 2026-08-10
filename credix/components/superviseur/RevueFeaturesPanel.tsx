'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';

interface Props { features?: Record<string, any>; }

function fmtVal(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4);
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
}

export function RevueFeaturesPanel({ features }: Props) {
  const [open, setOpen] = useState(false);
  const entries = features ? Object.entries(features) : [];

  if (entries.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Toutes les variables du dossier ({entries.length})
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">
            Profil + agrégats ETL (bureau de crédit, historique de paiement) utilisés par le modèle.
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
            {entries.map(([k, v]) => (
              <div key={k} className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate" title={k}>{k}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono truncate">{fmtVal(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
