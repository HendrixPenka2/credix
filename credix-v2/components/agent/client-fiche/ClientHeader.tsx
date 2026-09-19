import Link from "next/link";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RhoBadge } from "@/components/shared/StatusPill";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ClientHeader({ client, onEdit }: { client: Client; onEdit: () => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <InitialsAvatar firstName={client.profile.prenom} lastName={client.profile.nom} className="h-16 w-16 text-lg" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-headline-lg text-on-surface">
              {client.profile.prenom} {client.profile.nom}
            </h2>
            <span className="font-mono text-on-surface-variant text-sm">{client.client_id}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap font-body-sm text-on-surface-variant">
            {client.profile.type_emploi && <span>{client.profile.type_emploi}</span>}
            {client.profile.agence_saisie && <span>· {client.profile.agence_saisie}</span>}
            <span>· Client depuis {formatDate(client.created_at)}</span>
            <RhoBadge rho={client.coverage.rho} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onEdit}>
          <Icon name="edit" size={16} />
          Modifier le profil
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/simul?client=${client.client_id}`}>
            <Icon name="science" size={16} />
            Simuler
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/score?client=${client.client_id}`}>
            <Icon name="analytics" size={16} />
            Nouveau scoring
          </Link>
        </Button>
      </div>
    </div>
  );
}
