"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/shared/ScoreGauge";
import { CoverageRing } from "@/components/shared/CoverageRing";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";
import { formatPd } from "@/lib/utils";
import type { ScoringResult, Client } from "@/lib/types";

export function ResultStep({ result, client, onRestart }: { result: ScoringResult; client: Client; onRestart: () => void }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const blob = await decisionsRepository.downloadPdf(result.demande_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${result.demande_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-card-padding">
          <div className="flex justify-between items-start mb-2">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Score PDO global</p>
            <Badge tone="info">Fiabilité XAI : Élevée</Badge>
          </div>
          <div className="flex flex-col items-center py-2">
            <ScoreGauge score={result.score_pdo} decision={result.decision} />
            <DecisionBadge decision={result.decision} className="mt-2" />
          </div>
          <p className="font-body-sm text-on-surface-variant text-center mt-2">
            Probabilité de défaut calibrée : <span className="font-mono text-on-surface">{formatPd(result.pd_c)}</span>
          </p>
        </Card>

        <Card className="p-card-padding">
          <CardTitle className="mb-4">Facteurs d&apos;influence (XAI)</CardTitle>
          <ShapBlock items={result.shap_top5} />
        </Card>

        <AnomalyPanel data={result} />
      </div>

      <div className="space-y-6">
        <Card className="p-card-padding">
          <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Couverture de données (ρ)</p>
          <div className="flex justify-center">
            <CoverageRing rho={result.rho_c} size={120} />
          </div>
          {result.recommandation_rho.afficher && (
            <div className="mt-4 space-y-2">
              <p className="font-body-sm text-warning-amber font-medium">{result.recommandation_rho.message}</p>
              {result.recommandation_rho.documents_recommandes?.map((doc) => (
                <div key={doc.feature} className="flex items-center justify-between font-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Icon name="description" size={16} />
                    {doc.document} <span className="text-on-surface-variant/70">({doc.libelle})</span>
                  </span>
                  <span className="font-mono text-success-emerald">{doc.gain_rho_estime}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {result.percentile.percentile != null && (
          <Card className="p-card-padding">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Positionnement</p>
            <p className="font-data-lg text-on-surface">Percentile {result.percentile.percentile}</p>
            <p className="font-body-sm text-on-surface-variant mt-1">{result.percentile.message}</p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={handleDownloadPdf} loading={downloading}>
            <Icon name="download" size={18} />
            Télécharger le rapport PDF
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/simul?client=${client.client_id}`}>
              <Icon name="science" size={18} />
              Lancer une simulation
            </Link>
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            <Icon name="refresh" size={18} />
            Recommencer
          </Button>
        </div>
      </div>
    </div>
  );
}
