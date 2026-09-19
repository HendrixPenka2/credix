"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { InitialsAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { NAV_BY_ROLE, isNavItemActive } from "./nav-config";
import { usePendingReviewCount } from "@/hooks/usePendingReviewCount";

const ROLE_LABEL: Record<Role, string> = { AGENT: "Agent", SUPERVISEUR: "Superviseur", ADMIN: "Administrateur" };

export interface SidebarProps {
  role: Role;
  user: { nom: string; prenom: string } | null;
  onLogout: () => void;
}

/**
 * Sidebar fixe 260px, fond sombre constant dans les deux thèmes (motif
 * majoritaire des maquettes Stitch — vue générale admin, dashboard
 * superviseur — cohérent avec le token `primary: #000000` de la marque).
 */
export function Sidebar({ role, user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const groups = NAV_BY_ROLE[role];
  const pendingCount = usePendingReviewCount(role === "SUPERVISEUR" || role === "ADMIN");

  return (
    <nav className="fixed left-0 top-0 z-30 hidden h-full w-[260px] flex-col bg-slate-900 lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
          <Icon name="analytics" filled />
        </span>
        <div>
          <p className="font-headline-sm text-white leading-none">Credix AI</p>
          <p className="font-label-md text-slate-400 mt-0.5">{ROLE_LABEL[role]}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-5">
        {groups.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && <p className="px-3 mb-1.5 font-label-md text-slate-500 uppercase tracking-wider">{group.title}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 font-body-sm transition-colors",
                        active ? "bg-white/10 text-white border-l-4 border-white -ml-1 pl-4" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      )}
                    >
                      <Icon name={item.icon} size={20} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge === "pending-review" && pendingCount != null && pendingCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-rose px-1 font-label-md text-white">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <InitialsAvatar firstName={user?.prenom} lastName={user?.nom} />
          <div className="flex-1 min-w-0">
            <p className="font-data-sm text-white truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="font-label-md text-slate-500 truncate">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
        >
          <Icon name="logout" size={20} />
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
