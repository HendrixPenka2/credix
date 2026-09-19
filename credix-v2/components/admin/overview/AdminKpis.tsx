import { KpiCard } from "@/components/shared/KpiCard";
import { nomVersion } from "@/components/superviseur/modele/ModelVersionsTable";
import type { AdminUser, ModelVersion } from "@/lib/types";

export function AdminKpis({ users, versions }: { users: AdminUser[]; versions: ModelVersion[] }) {
  const agentsActifs = users.filter((u) => u.role === "AGENT" && u.actif).length;
  const superviseursActifs = users.filter((u) => u.role === "SUPERVISEUR" && u.actif).length;
  const production = versions.find((v) => v.statut === "PRODUCTION");
  const enAttente = versions.filter((v) => v.statut === "STAGING").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Agents actifs" value={agentsActifs} icon="support_agent" variant="chip" tone="info" />
      <KpiCard label="Superviseurs actifs" value={superviseursActifs} icon="shield_person" variant="chip" tone="violet" />
      <KpiCard label="Modèle en production" value={production ? nomVersion(production) : "Aucun"} icon="check_circle" variant="chip" tone="success" />
      <KpiCard label="Versions en attente" value={enAttente} icon="pending_actions" variant="chip" tone={enAttente > 0 ? "warning" : "neutral"} />
    </div>
  );
}
