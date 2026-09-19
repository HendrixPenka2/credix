import { Banner } from "@/components/shared/Banner";
import { rhoTier } from "@/lib/design-tokens";
import type { Client } from "@/lib/types";

/** Bannières contextuelles au-dessus des onglets — cf. cdc_credix.md §5.2 /clients/[id]. */
export function ClientBanners({ client }: { client: Client }) {
  if (client.is_new_client) {
    return (
      <Banner
        variant="info"
        title="Nouveau client sans historique"
        description="Aucun scoring n'a encore été réalisé pour ce dossier. Lancez un premier scoring pour obtenir un score et une décision."
      />
    );
  }

  const tier = rhoTier(client.coverage.rho);
  if (tier === "critique") {
    return (
      <Banner
        variant="critical"
        title="Couverture de données critique"
        description={`Seulement ${Math.round(client.coverage.rho * 100)}% des sources de données sont disponibles — une revue manuelle sera systématiquement déclenchée.`}
      />
    );
  }
  if (tier === "partielle") {
    return (
      <Banner
        variant="warning"
        title="Couverture de données partielle"
        description={`${Math.round(client.coverage.rho * 100)}% des sources sont disponibles. Enrichir le dossier améliorera la fiabilité du score.`}
      />
    );
  }
  return null;
}
