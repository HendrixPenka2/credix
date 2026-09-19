"use client";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ClientSelector } from "@/components/shared/ClientSelector";
import type { ClientSearchResult } from "@/lib/types";

export function ClientPicker({ onSelect }: { onSelect: (client: ClientSearchResult) => void }) {
  return (
    <Card className="p-card-padding">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="person_search" className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Sélectionner un client</h3>
      </div>
      <ClientSelector onSelect={onSelect} />
    </Card>
  );
}
