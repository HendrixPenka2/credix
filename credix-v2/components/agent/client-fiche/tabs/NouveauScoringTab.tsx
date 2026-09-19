import { ScoringWizard } from "@/components/agent/scoring/ScoringWizard";
import type { Client } from "@/lib/types";

export function NouveauScoringTab({ client }: { client: Client }) {
  return <ScoringWizard initialClient={client} embedded />;
}
