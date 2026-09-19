import { SimulationWizard } from "@/components/agent/simul/SimulationWizard";
import type { Client } from "@/lib/types";

export function SimulationTab({ client }: { client: Client }) {
  return <SimulationWizard initialClient={client} embedded />;
}
