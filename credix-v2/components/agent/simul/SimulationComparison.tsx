import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/shared/ScoreGauge";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import { AnomalyPanel } from "@/components/shared/AnomalyPanel";
import { ShapBlock } from "@/components/shared/ShapBlock";
import { formatPd } from "@/lib/utils";
import type { SimulationResult, Client } from "@/lib/types";

function DeltaChip({ delta, invert = false }: { delta: number; invert?: boolean }) {
  const positive = invert ? delta < 0 : delta > 0;
  return (
    <span className={`font-data-sm ${positive ? "text-success-emerald" : delta === 0 ? "text-on-surface-variant" : "text-danger-rose"}`}>
      {delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "→ "}
      {delta}
    </span>
  );
}

export function SimulationComparison({ result, client }: { result: SimulationResult; client: Client }) {
  const lastScore = client.last_score;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-card-padding opacity-80">
        <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Actuel (dernier score)</p>
        {lastScore ? (
          <>
            <div className="flex flex-col items-center py-2">
              <ScoreGauge score={lastScore.score_pdo} decision={lastScore.decision} size={180} />
              <DecisionBadge decision={lastScore.decision} className="mt-2" />
            </div>
            <p className="font-body-sm text-on-surface-variant text-center mt-2">PD calibrée : {formatPd(lastScore.pd_c)}</p>
          </>
        ) : (
          <p className="font-body-sm text-on-surface-variant text-center py-12">Aucun score réel existant — première simulation pour ce client.</p>
        )}
      </Card>

      <Card className="p-card-padding border-2 border-simulation-orange relative">
        <span className="absolute top-3 right-3">
          <Badge tone="orange">SIMULÉ</Badge>
        </span>
        <p className="font-label-md text-simulation-orange uppercase tracking-wider mb-3">Scénario simulé</p>
        <div className="flex flex-col items-center py-2">
          <ScoreGauge score={result.score_pdo} decision={result.decision} size={180} />
          <DecisionBadge decision={result.decision} className="mt-2" />
        </div>
        <p className="font-body-sm text-on-surface-variant text-center mt-2">PD calibrée : {formatPd(result.pd_c)}</p>
        {lastScore && (
          <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-outline-variant/60">
            <div className="text-center">
              <p className="font-label-md text-on-surface-variant">Δ Score</p>
              <DeltaChip delta={result.score_pdo - lastScore.score_pdo} />
            </div>
            <div className="text-center">
              <p className="font-label-md text-on-surface-variant">Δ PD</p>
              <DeltaChip delta={Number(((result.pd_c - lastScore.pd_c) * 100).toFixed(1))} invert />
            </div>
          </div>
        )}
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card className="p-card-padding">
          <p className="font-headline-sm text-on-surface mb-4">Facteurs d&apos;influence du scénario</p>
          <ShapBlock items={result.shap_top3} />
        </Card>
        <AnomalyPanel data={result} />
      </div>
    </div>
  );
}
