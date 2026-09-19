import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AvatarNameRow } from "@/components/shared/AvatarNameRow";
import { RoleBadge } from "@/components/shared/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

export function UsersTable({ users, onToggle }: { users: AdminUser[]; onToggle: (user: AdminUser) => void }) {
  if (users.length === 0) {
    return <EmptyState icon="group_off" title="Aucun utilisateur" description="Aucun compte ne correspond à cette recherche." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Agence</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Dernière connexion</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.user_id} className="group">
            <TableCell>
              <AvatarNameRow firstName={u.profil.prenom} lastName={u.profil.nom} subtitle={u.profil.email} size="sm" />
            </TableCell>
            <TableCell>
              <RoleBadge role={u.role} />
            </TableCell>
            <TableCell className="text-on-surface-variant">{u.profil.agence ?? "—"}</TableCell>
            <TableCell>
              <Badge tone={u.actif ? "success" : "neutral"} dotted>
                {u.actif ? "Actif" : "Inactif"}
              </Badge>
            </TableCell>
            <TableCell className="text-on-surface-variant">{formatDateTime(u.statistiques?.derniere_connexion)}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                className={u.actif ? "hover:border-danger-rose hover:text-danger-rose" : "hover:border-success-emerald hover:text-success-emerald"}
                onClick={() => onToggle(u)}
              >
                <Icon name={u.actif ? "block" : "check_circle"} size={16} />
                {u.actif ? "Désactiver" : "Activer"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
