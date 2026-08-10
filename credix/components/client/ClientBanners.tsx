'use client';

import Link from 'next/link';
import { Users, ShieldAlert, AlertTriangle } from 'lucide-react';

interface Props {
  clientId: string;
  isNewClient: boolean;
  hasHistory: boolean; // coverage.has_history
  rho: number;         // coverage.rho (0 à 1)
}

/**
 * Bannières contextuelles affichées en haut du profil client.
 *
 * RÈGLE THIN-FILE (importante) :
 *   Un client jamais scoré a rho=0 par défaut — ce n'est PAS un thin-file.
 *   On affiche une bannière thin-file UNIQUEMENT si has_history=true
 *   (le client a été scoré au moins une fois) ET rho < seuil.
 *   Sans ça, tous les nouveaux clients apparaissent à tort comme critiques.
 */
export function ClientBanners({ clientId, isNewClient, hasHistory, rho }: Props) {
  const isCritique = hasHistory && rho < 0.25;
  const isPartiel  = hasHistory && rho >= 0.25 && rho < 0.40;

  return (
    <div className="space-y-2">

      {/* Nouveau client — jamais scoré */}
      {isNewClient && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
          <Users className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 flex-1">
            Nouveau client — aucun historique de scoring. Lancez le premier scoring.
          </p>
          <Link
            href={`/score?client_id=${clientId}`}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Scorer →
          </Link>
        </div>
      )}

      {/* Couverture critique (scoré + rho < 25%) */}
      {isCritique && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Couverture critique (ρc &lt; 25%) — Revue manuelle forcée. Demandez les documents manquants.
          </p>
        </div>
      )}

      {/* Couverture partielle (scoré + 25% ≤ rho < 40%) */}
      {isPartiel && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Couverture partielle (ρc &lt; 40%) — Enrichissement recommandé pour améliorer la fiabilité.
          </p>
        </div>
      )}
    </div>
  );
}