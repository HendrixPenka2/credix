'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, UserPlus, Search, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '@/lib/types';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { UsersTable } from '@/components/admin/UsersTable';
import { ToggleUserModal } from '@/components/admin/ToggleUserModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

const ROLES = ['TOUS', 'AGENT', 'SUPERVISEUR', 'ADMIN'] as const;

export default function UtilisateursPage() {
  const router = useRouter();
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState<typeof ROLES[number]>('TOUS');
  const [toToggle, setToToggle] = useState<AdminUser | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminRepository.getUsers()
      .then(res => setUsers(res.users ?? []))
      .catch(() => setError('Impossible de charger les comptes. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const matchRole = roleFilter === 'TOUS' || u.role === roleFilter;
      const matchQ = !q ||
        u.username.toLowerCase().includes(q) ||
        u.profil?.nom?.toLowerCase().includes(q) ||
        u.profil?.prenom?.toLowerCase().includes(q);
      return matchRole && matchQ;
    });
  }, [users, search, roleFilter]);

  const handleToggle = async (userId: string) => {
    await adminRepository.toggleUser(userId);
    setToToggle(null);
    setSuccessMsg('Statut du compte mis à jour.');
    load();
  };

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <Users className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Liste des comptes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {users.length} compte{users.length > 1 ? 's' : ''} — agents, superviseurs et administrateurs
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/admin/utilisateurs/nouveau')}>
          <UserPlus className="w-4 h-4" />Nouveau compte
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          icon={<Search />}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1.5">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                roleFilter === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300'
              )}>
              {r === 'TOUS' ? 'Tous' : r}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}
      {!loading && !error && <UsersTable users={filtered} onToggle={setToToggle} />}

      {toToggle && (
        <ToggleUserModal user={toToggle} onConfirm={handleToggle} onClose={() => setToToggle(null)} />
      )}
    </div>
  );
}
