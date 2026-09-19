import { HistPanel } from "@/components/agent/hist/HistPanel";
import type { Client } from "@/lib/types";

export function HistoriqueTab({ client }: { client: Client }) {
  return <HistPanel clientId={client.client_id} />;
}
