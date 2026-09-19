import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ModelDrift } from "@/lib/types";

export function PsiInfoCard({ drift }: { drift: ModelDrift }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card className="p-card-padding">
        <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Échantillon de référence</p>
        <p className="font-data-lg text-on-surface mt-1">{drift.nb_scores_reference ?? "—"}</p>
        {drift.periode_reference && <p className="font-body-sm text-on-surface-variant mt-1">Depuis le {formatDate(drift.periode_reference)}</p>}
      </Card>
      <Card className="p-card-padding">
        <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Échantillon actuel</p>
        <p className="font-data-lg text-on-surface mt-1">{drift.nb_scores_actuels ?? "—"}</p>
        {drift.calcule_le && <p className="font-body-sm text-on-surface-variant mt-1">Calculé le {formatDate(drift.calcule_le)}</p>}
      </Card>
    </div>
  );
}
