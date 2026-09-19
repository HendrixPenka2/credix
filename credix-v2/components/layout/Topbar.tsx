"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "./ThemeToggle";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearch } from "./GlobalSearch";
import { usePendingReviewCount } from "@/hooks/usePendingReviewCount";
import type { Role } from "@/lib/types";

export function Topbar({ role }: { role: Role }) {
  const showNotifications = role === "SUPERVISEUR" || role === "ADMIN";
  const pendingCount = usePendingReviewCount(showNotifications);
  const revuePath = role === "ADMIN" ? "/admin" : "/superviseur/revue";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md px-gutter">
      <Breadcrumbs />
      <div className="flex items-center gap-3 flex-1 justify-end">
        <GlobalSearch />
        {showNotifications && (
          <Link
            href={revuePath}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <Icon name="notifications" size={20} />
            {pendingCount != null && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-rose px-1 font-label-md text-white text-[10px]">
                {pendingCount}
              </span>
            )}
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
