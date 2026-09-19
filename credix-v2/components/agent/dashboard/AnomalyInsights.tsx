import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { AnomalyStatistics } from "@/lib/types";

/**
 * Bloc "Interceptions IA" — met en avant le score d'anomalie du Flux B à
 * l'échelle de l'activité de l'agent (cf. cdc_credix.md §5.2 /dashboard).
 */
export function AnomalyInsights({ stats, loading }: { stats: AnomalyStatistics | null; loading: boolean }) {
  if (loading || !stats) return <SkeletonCard className="h-full" />;

  if (stats.nb_anomalies === 0) {
    return (
      <Card className="p-card-padding flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-emerald/10 text-success-emerald shrink-0">
          <Icon name="verified_user" filled />
        </span>
        <div>
          <p className="font-headline-sm text-on-surface">Interceptions IA</p>
          <p className="font-body-sm text-on-surface-variant">Aucun profil atypique détecté sur la période sélectionnée.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-card-padding relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-secondary">
            <Icon name="troubleshoot" filled />
            <h3 className="font-headline-sm text-on-surface">Interceptions IA</h3>
          </div>
          <p className="font-body-sm text-on-surface-variant">
            Le détecteur secondaire (Flux B) a signalé {stats.nb_anomalies} profil{stats.nb_anomalies > 1 ? "s" : ""} atypique
            {stats.nb_anomalies > 1 ? "s" : ""}, dont {stats.nb_escalades} escaladé{stats.nb_escalades > 1 ? "s" : ""} en revue
            manuelle malgré une décision initiale favorable.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <div className="bg-secondary/5 border border-secondary/20 rounded px-3 py-1.5 flex flex-col">
              <span className="font-label-md text-secondary">Taux d&apos;anomalie</span>
              <span className="font-data-lg text-on-surface">{stats.taux_anomalie_pct.toFixed(1)}%</span>
            </div>
            {stats.anomaly_score_moyen != null && (
              <div className="bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 flex flex-col">
                <span className="font-label-md text-on-surface-variant">Score moyen</span>
                <span className="font-data-lg text-on-surface">{stats.anomaly_score_moyen.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col justify-center gap-3 w-full md:w-auto">
          <Button variant="secondary" asChild>
            <Link href="/hist">
              Examiner ({stats.nb_anomalies})
              <Icon name="arrow_forward" size={18} />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
