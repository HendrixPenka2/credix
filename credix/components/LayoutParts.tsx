'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Users, UserPlus, BarChart2, Inbox, CheckSquare,
  History as HistoryIcon, FileText, Layers, PieChart, Target,
  Activity, Dna, Settings, LogOut, Bell, ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingReviewCount } from '@/hooks/usePendingReviewCount';
import { InitialsAvatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/badge';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ─── NavItem ────────────────────────────────────────────────────────────────

const NavItem = ({
  href,
  icon: Icon,
  label,
  badgeCount,
  pathname,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badgeCount?: number | null;
  pathname: string;
}) => {
  const EXACT_ONLY = ['/clients', '/superviseur', '/admin'];
  const isActive = pathname === href || (pathname.startsWith(href + '/') && !EXACT_ONLY.includes(href));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors',
        isActive
          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </div>
      {!!badgeCount && (
        <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );
};

// ─── NavGroup ───────────────────────────────────────────────────────────────

const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <h3 className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
      {title}
    </h3>
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);

// ─── Sidebar ────────────────────────────────────────────────────────────────

export function Sidebar({
  role,
  user,
  onLogout,
}: {
  role: 'AGENT' | 'SUPERVISEUR' | 'ADMIN';
  user: { prenom: string; nom: string };
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const revueCount = usePendingReviewCount(role === 'SUPERVISEUR' || role === 'ADMIN');

  return (
    <div className="w-[250px] shrink-0 flex flex-col h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

      {/* ── Logo ── */}
      <div className="h-[60px] flex items-center px-5 border-b border-slate-200 dark:border-slate-800 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">
            CREDIX
          </span>
        </div>
        <SimpleTooltip label="Backend connecté">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </SimpleTooltip>
      </div>

      {/* ── Utilisateur ── */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
        <InitialsAvatar firstName={user?.prenom} lastName={user?.nom} />
        <div className="flex flex-col overflow-hidden gap-0.5">
          <span className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100 truncate">
            {user?.prenom} {user?.nom}
          </span>
          <RoleBadge role={role} className="w-fit px-1.5 py-0 text-[10px]" />
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">

        {role === 'AGENT' && (
          <>
            <NavGroup title="Tableau de bord">
              <NavItem pathname={pathname} href="/dashboard" icon={BarChart2} label="Mes statistiques" />
            </NavGroup>
            <NavGroup title="Clients">
              <NavItem pathname={pathname} href="/clients" icon={Search} label="Rechercher" />
              <NavItem pathname={pathname} href="/clients/nouveau" icon={UserPlus} label="Nouveau client" />
            </NavGroup>
            <NavGroup title="Dossiers">
              <NavItem pathname={pathname} href="/rep" icon={FileText} label="Mes rapports PDF" />
              <NavItem pathname={pathname} href="/hist" icon={HistoryIcon} label="Historique" />
            </NavGroup>
          </>
        )}

        {role === 'SUPERVISEUR' && (
          <>
            <NavGroup title="File de travail">
              <NavItem pathname={pathname} href="/superviseur/revue" icon={Inbox} label="Dossiers en revue" badgeCount={revueCount} />
              <NavItem pathname={pathname} href="/superviseur/mes-validations" icon={CheckSquare} label="Mes validations" />
            </NavGroup>
            <NavGroup title="Clients">
              <NavItem pathname={pathname} href="/clients" icon={Search} label="Rechercher" />
            </NavGroup>
            <NavGroup title="Portefeuille">
              <NavItem pathname={pathname} href="/superviseur" icon={Layers} label="Vue d'ensemble" />
              <NavItem pathname={pathname} href="/superviseur/distribution" icon={PieChart} label="Distribution scores" />
              <NavItem pathname={pathname} href="/superviseur/tranches" icon={Target} label="Tranches de risque" />
            </NavGroup>
            <NavGroup title="Modèle IA">
              <NavItem pathname={pathname} href="/superviseur/modele/derive" icon={Activity} label="Dérive globale PSI" />
              <NavItem pathname={pathname} href="/superviseur/modele/variables" icon={Dna} label="Dérive par variable" />
              <NavItem pathname={pathname} href="/superviseur/modele/versions" icon={Layers} label="Versions du modèle" />
            </NavGroup>
          </>
        )}

        {role === 'ADMIN' && (
          <>
            <NavGroup title="Tableau de bord">
              <NavItem pathname={pathname} href="/admin" icon={BarChart2} label="Vue générale" />
            </NavGroup>
            <NavGroup title="Utilisateurs">
              <NavItem pathname={pathname} href="/admin/utilisateurs" icon={Users} label="Liste des comptes" />
              <NavItem pathname={pathname} href="/admin/utilisateurs/nouveau" icon={UserPlus} label="Nouveau compte" />
            </NavGroup>
            <NavGroup title="Configuration">
              <NavItem pathname={pathname} href="/admin/configuration" icon={Settings} label="Seuils PDO & ρc" />
            </NavGroup>
            <NavGroup title="Modèle IA">
              <NavItem pathname={pathname} href="/admin/modeles" icon={Layers} label="Versions du modèle" />
              <NavItem pathname={pathname} href="/admin/modeles/derive" icon={Activity} label="Dérive globale PSI" />
              <NavItem pathname={pathname} href="/admin/modeles/variables" icon={Dna} label="Dérive par variable" />
            </NavGroup>
            <NavGroup title="Audit">
              <NavItem pathname={pathname} href="/admin/audit" icon={FileText} label="Journal d'audit" />
              <NavItem pathname={pathname} href="/clients" icon={Search} label="Recherche clients" />
            </NavGroup>
          </>
        )}
      </div>

      {/* ── Bas de sidebar ── */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1 shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}

// ─── Topbar ─────────────────────────────────────────────────────────────────

export function Topbar({
  title,
  breadcrumbs,
}: {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const router = useRouter();
  const { role } = useAuth();
  const revueCount = usePendingReviewCount(role === 'SUPERVISEUR' || role === 'ADMIN');
  const revuePath = role === 'ADMIN' ? '/admin' : '/superviseur/revue';

  return (
    <div className="h-[60px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">

      {/* ── Breadcrumbs / titre ── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
        {breadcrumbs ? (
          breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  {crumb.label}
                </span>
              )}
              {i < breadcrumbs.length - 1 && (
                <span className="text-slate-300 dark:text-slate-600">/</span>
              )}
            </div>
          ))
        ) : (
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{title}</span>
        )}
      </nav>

      {/* ── Actions droite ── */}
      <div className="flex items-center gap-2">
        <GlobalSearch />

        {/* Notifications — réservé SUPERVISEUR/ADMIN, lié à la file de revue réelle */}
        {(role === 'SUPERVISEUR' || role === 'ADMIN') && (
          <SimpleTooltip label={revueCount ? `${revueCount} dossier(s) en revue` : 'Aucun dossier en revue'}>
            <button
              onClick={() => router.push(revuePath)}
              className="relative w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {!!revueCount && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </button>
          </SimpleTooltip>
        )}

        {/* Toggle dark/light */}
        <ThemeToggle variant="default" />
      </div>
    </div>
  );
}
