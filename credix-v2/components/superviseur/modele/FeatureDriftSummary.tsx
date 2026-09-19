import { KpiCard } from "@/components/shared/KpiCard";
import type { FeatureDrift } from "@/lib/types";

/** 5 cartes de synthèse — cf. d_rive_par_variable_credix_ai. */
export function FeatureDriftSummary({ drift }: { drift: FeatureDrift }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <KpiCard label="Total analysées" value={drift.nb_features_analysees} icon="dataset" />
      <KpiCard label="Stables" value={drift.nb_stables} icon="check_circle" tone="success" variant="border" />
      <KpiCard label="Attention" value={drift.nb_attention} icon="warning" tone="warning" variant="border" />
      <KpiCard label="En dérive" value={drift.nb_derives} icon="error" tone="danger" variant="border" />
      <KpiCard label="Insuffisant" value={drift.nb_insuffisant} icon="help" tone="neutral" variant="border" />
    </div>
  );
}
