"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonTable } from "@/components/ui/skeleton";
import { UsersFilterBar, type UsersFilters } from "@/components/admin/utilisateurs/UsersFilterBar";
import { UsersTable } from "@/components/admin/utilisateurs/UsersTable";
import { ToggleUserModal } from "@/components/admin/utilisateurs/ToggleUserModal";
import type { AdminUser } from "@/lib/types";

const PAGE_SIZE = 10;

export default function UtilisateursPage() {
  const { data, loading, error, refetch, } = useApi(useCallback(() => adminRepository.getUsers(), []));
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [filters, setFilters] = useState<UsersFilters>({ query: "", role: "all" });
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<AdminUser | null>(null);

  const allUsers = users ?? data?.users ?? [];

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchesRole = filters.role === "all" || u.role === filters.role;
      const matchesQuery =
        q.length === 0 ||
        `${u.profil.prenom} ${u.profil.nom} ${u.username} ${u.profil.email}`.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [allUsers, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-on-surface">Utilisateurs</h2>
          <p className="font-body-sm text-on-surface-variant mt-1">{allUsers.length} comptes enregistrés.</p>
        </div>
        <Button asChild>
          <Link href="/admin/utilisateurs/nouveau">
            <Icon name="person_add" size={18} />
            Nouveau compte
          </Link>
        </Button>
      </div>

      <UsersFilterBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading || !data ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <>
          <UsersTable users={pageItems} onToggle={setToggling} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="font-body-sm text-on-surface-variant">
                Affichage de {(page - 1) * PAGE_SIZE + 1} à {Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded font-body-sm ${p === page ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ToggleUserModal
        user={toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        onToggled={(userId, actif) => {
          setUsers((allUsers.length ? allUsers : data?.users ?? []).map((u) => (u.user_id === userId ? { ...u, actif } : u)));
        }}
      />
    </div>
  );
}
