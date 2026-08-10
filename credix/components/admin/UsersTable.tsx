'use client';

import { Power, Inbox } from 'lucide-react';
import { AdminUser } from '@/lib/types';
import { RoleBadge } from '@/components/ui/badge';
import { InitialsAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  users: AdminUser[];
  onToggle: (user: AdminUser) => void;
}

function StatutBadge({ actif }: { actif: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium',
      actif ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', actif ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
      {actif ? 'Actif' : 'Inactif'}
    </span>
  );
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais connecté';

export function UsersTable({ users, onToggle }: Props) {
  if (users.length === 0) {
    return <EmptyState icon={Inbox} title="Aucun compte ne correspond" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-transparent hover:bg-transparent">
          {['Utilisateur', 'Rôle', 'Agence', 'Statut', 'Dernière connexion', ''].map(h => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(u => (
          <TableRow key={u.user_id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <InitialsAvatar firstName={u.profil?.prenom} lastName={u.profil?.nom} className="w-9 h-9 text-xs" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{u.profil?.prenom} {u.profil?.nom}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">@{u.username}</p>
                </div>
              </div>
            </TableCell>
            <TableCell><RoleBadge role={u.role} /></TableCell>
            <TableCell className="text-sm">{u.profil?.agence ?? '—'}</TableCell>
            <TableCell><StatutBadge actif={u.actif} /></TableCell>
            <TableCell className="text-xs">{fmtDate(u.statistiques?.derniere_connexion)}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  u.actif
                    ? 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/30 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                    : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                )}
                onClick={() => onToggle(u)}
              >
                <Power className="w-3.5 h-3.5" />{u.actif ? 'Désactiver' : 'Activer'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
