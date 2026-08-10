// DESTINATION: components/dashboard/QuickActions.tsx
// (v2 — remplace "Historique" par "Rechercher un client", remplace le fichier précédent)
'use client';

import { useRouter } from 'next/navigation';
import { Zap, FlaskConical, UserPlus, Search, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { label: 'Nouveau scoring',      sub: 'Lancer une évaluation IA',     icon: Zap,          href: '/score',          color: 'blue' },
  { label: 'Simulateur what-if',   sub: 'Tester un scénario',           icon: FlaskConical, href: '/simul',          color: 'amber' },
  { label: 'Nouveau client',       sub: 'Créer une fiche',              icon: UserPlus,     href: '/clients/nouveau', color: 'emerald' },
  { label: 'Rechercher un client', sub: 'Voir score, historique, XAI…', icon: Search,       href: '/clients',        color: 'blue' },
] as const;

const COLOR_CLS: Record<string, string> = {
  blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30',
  amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30',
};

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-4 gap-4">
      {ACTIONS.map(({ label, sub, icon: Icon, href, color }) => (
        <button
          key={href}
          onClick={() => router.push(href)}
          className={cn(
            'group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800',
            'shadow-xs dark:shadow-none p-5 flex flex-col items-start gap-3 text-left',
            'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.99] transition-all'
          )}
        >
          <ArrowUpRight className="absolute top-4 right-4 w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border shrink-0', COLOR_CLS[color])}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}