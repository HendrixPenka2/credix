import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import type { OverrideStats } from "@/lib/types";

/** Auto-évaluation ("mes seuils sont-ils trop stricts ou trop laxistes ?") — texte fourni par le backend (interpretation). */
export function AlignmentInsight({ stats }: { stats: OverrideStats }) {
  return (
    <Card className="p-card-padding bg-gradient-to-br from-supervisor-violet/5 to-surface-container-low">
      <div className="flex items-center gap-2 mb-2 text-supervisor-violet">
        <Icon name="auto_awesome" filled />
        <p className="font-headline-sm text-on-surface">Analyse d&apos;alignement</p>
      </div>
      <div className="rounded-lg bg-surface-container-lowest/60 p-3">
        <p className="font-body-sm text-on-surface">
          {stats.interpretation}. Sur {stats.total_revue} dossiers passés en revue, vous avez tranché {stats.total_overrides}, avec un taux
          d&apos;accord avec le modèle de <strong>{stats.taux_accord_pct.toFixed(1)}%</strong>.
        </p>
      </div>
    </Card>
  );
}
