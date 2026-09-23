import { Icon } from "@/components/ui/icon";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { labelFor, formatFeatureValue } from "@/lib/feature-labels";
import type { AnomalyFields } from "@/lib/types";

export interface AnomalyPanelProps {
  data: AnomalyFields;
  className?: string;
}

/**
 * Bloc "Détection d'anomalie" (Flux B / garde-fou IA) — deux états : profil
 * normal (vert, rassurant) ou profil atypique intercepté (ambre, alerte).
 * Affiche systématiquement anomaly_score / détecteur / percentile, et le
 * détail `top_facteurs_anomalie` quand l'autoencodeur les a produits.
 *
 * Ce composant existe spécifiquement parce que ces champs (déjà renvoyés par
 * le backend) n'étaient pas rendus visibles dans l'ancien frontend — à poser
 * sur /score, /simul, la fiche client (Vue d'ensemble + XAI), la revue
 * superviseur et l'historique.
 */
export function AnomalyPanel({ data, className }: AnomalyPanelProps) {
  const { is_anomaly, anomaly_score, if_escalade, if_detecteur, if_percentile, top_facteurs_anomalie } = data;

  if (!is_anomaly) {
    return (
      <div className={cn("rounded-lg border border-success-emerald/20 bg-success-emerald/5 p-4", className)}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-emerald/10 text-success-emerald">
            <Icon name="verified_user" filled />
          </span>
          <div>
            <p className="font-data-sm text-on-surface">Analyse de profil (Flux B) — Aucune anomalie</p>
            <p className="font-body-sm text-on-surface-variant mt-0.5">
              Le détecteur secondaire n'a signalé aucun profil atypique sur ce dossier.
              {anomaly_score != null && ` Score d'anomalie : ${anomaly_score.toFixed(3)} (percentile P${if_percentile}).`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-warning-amber/20 bg-warning-amber/5 p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-amber/10 text-warning-amber">
          <Icon name="report" filled />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-data-sm text-on-surface">
            Détection d'anomalie (Flux B){if_escalade && " — Revue forcée"}
          </p>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            Ce profil a été jugé statistiquement atypique par le détecteur secondaire
            {if_detecteur && ` (${if_detecteur === "autoencoder" ? "autoencodeur" : "isolation forest"})`}
            {if_escalade && " et sa décision a été forcée en revue manuelle, quel que soit le score initial"}.
          </p>
          <div className="flex flex-wrap gap-4 mt-3">
            {anomaly_score != null && (
              <div>
                <p className="font-label-md text-on-surface-variant">Score d'anomalie</p>
                <p className="font-data-sm text-on-surface tabular-nums">{anomaly_score.toFixed(3)}</p>
              </div>
            )}
            <div>
              <p className="font-label-md text-on-surface-variant">Percentile de référence</p>
              <p className="font-data-sm text-on-surface tabular-nums">P{if_percentile}</p>
            </div>
          </div>

          {top_facteurs_anomalie && top_facteurs_anomalie.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Facteurs explicatifs de l'anomalie</p>
              {top_facteurs_anomalie.map((f, i) => (
                <div key={`${f.feature}-${i}`} className="rounded-md border border-warning-amber/20 bg-surface-container-lowest p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-data-sm text-on-surface">{f.libelle_agent}</p>
                    <span className="font-mono text-[11px] text-warning-amber">
                      err={f.erreur_reconstruction.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="font-mono text-[10px] text-outline">{f.feature}</p>
                    <Dialog>
                      <DialogTrigger
                        className="flex items-center justify-center rounded text-outline hover:text-secondary hover:bg-surface-container transition-colors"
                        title="Voir la valeur brute saisie"
                      >
                        <Icon name="zoom_in" size={13} />
                      </DialogTrigger>
                      <DialogContent size="sm">
                        <DialogHeader>
                          <DialogTitle>{labelFor(f.feature)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody className="text-center py-10">
                          <p className="font-mono text-[11px] text-outline mb-3">{f.feature}</p>
                          <p className="font-display-lg text-on-surface break-words">
                            {formatFeatureValue(f.valeur_brute)}
                          </p>
                        </DialogBody>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-1">{f.explication_naturelle}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
