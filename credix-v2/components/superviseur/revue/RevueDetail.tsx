"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { InitialsAvatar } from "@/components/ui/avatar";
import { ScoreGauge } from "@/components/shared/ScoreGauge";
import { CoverageRing } from "@/components/shared/CoverageRing";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { Banner } from "@/components/shared/Banner";
import { RevueProfilCard } from "./RevueProfilCard";
import { RevueDeclaratifCard } from "./RevueDeclaratifCard";
import { RevueFeaturesPanel } from "./RevueFeaturesPanel";
import type { DecisionPendingReview } from "@/lib/types";

export function RevueDetail({ dossier }: { dossier: DecisionPendingReview }) {
  const [shapOpen, setShapOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <InitialsAvatar firstName={dossier.client_prenom} lastName={dossier.client_nom} className="h-16 w-16 text-lg shrink-0" />
        <div className="flex-1">
          <p className="font-display-lg text-on-surface leading-tight">
            {dossier.client_prenom} {dossier.client_nom}
          </p>
          <p className="font-mono text-on-surface-variant text-sm mt-1">{dossier.client_id}</p>
        </div>
        <div className="flex gap-3">
          <Card className="p-3 flex flex-col items-center">
            <ScoreGauge score={dossier.score_pdo} decision="REVUE_MANUELLE" size={130} />
          </Card>
          <Card className="p-3 flex flex-col items-center justify-center">
            <CoverageRing rho={dossier.rho_c} size={90} />
            <p className="font-label-md text-on-surface-variant mt-1">Couverture</p>
          </Card>
        </div>
      </div>

      <AnomalyPanel
        data={{
          is_anomaly: dossier.is_anomaly ?? false,
          anomaly_score: dossier.anomaly_score ?? null,
          if_escalade: dossier.if_escalade ?? false,
          if_detecteur: dossier.if_detecteur ?? null,
          if_percentile: 95,
          top_facteurs_anomalie: dossier.top_facteurs_anomalie,
        }}
      />

      {dossier.recommandation_rho?.afficher && (
        <Banner
          variant={dossier.recommandation_rho.niveau_urgence === "CRITIQUE" ? "critical" : "warning"}
          title="Complétude du dossier à améliorer"
          description={dossier.recommandation_rho.message}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <RevueProfilCard profile={dossier.client_profile} />
        <RevueDeclaratifCard declaratif={dossier.declaratif} />
      </div>

      <Card className="p-card-padding">
        <button
          type="button"
          onClick={() => setShapOpen((v) => !v)}
          className="flex w-full items-center justify-between mb-1"
        >
          <CardTitle>Analyse de l&apos;IA (facteurs SHAP)</CardTitle>
          <Icon name="expand_more" size={20} className={cn("transition-transform text-on-surface-variant", shapOpen && "rotate-180")} />
        </button>
        {shapOpen && <ShapBlock items={dossier.shap_top5} />}
      </Card>

      <RevueFeaturesPanel features={dossier.client_features} declaratif={dossier.declaratif} />
    </div>
  );
}
