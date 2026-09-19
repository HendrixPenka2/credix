"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonCard } from "@/components/ui/skeleton";
import { SeuilsPdoForm } from "@/components/admin/configuration/SeuilsPdoForm";
import { SeuilAlertePdForm } from "@/components/admin/configuration/SeuilAlertePdForm";
import { ActiveRuleCard } from "@/components/admin/configuration/ActiveRuleCard";
import { RhoReadOnlyCard } from "@/components/admin/configuration/RhoReadOnlyCard";
import { FluxBPercentileReadOnlyCard } from "@/components/admin/configuration/FluxBPercentileReadOnlyCard";

export default function ConfigurationPage() {
  const thresholdsApi = useApi(useCallback(() => adminRepository.getThresholds(), []));
  const portfolioApi = useApi(useCallback(() => dashboardRepository.getPortfolioRisk("all"), []));
  const percentileApi = useApi(useCallback(() => adminRepository.getFluxBPercentile(), []));

  const [rule, setRule] = useState<{ refuse: number; accorde: number } | null>(null);

  const loading = thresholdsApi.loading || portfolioApi.loading || percentileApi.loading;
  const error = thresholdsApi.error || percentileApi.error;

  const currentRefuse = rule?.refuse ?? thresholdsApi.data?.refuse;
  const currentAccorde = rule?.accorde ?? thresholdsApi.data?.accorde;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-on-surface">Configuration</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Seuils de décision et sensibilité de détection appliqués à tous les scorings.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => { thresholdsApi.refetch(); percentileApi.refetch(); }} />
      ) : loading || !thresholdsApi.data || !percentileApi.data ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonCard className="h-96 lg:col-span-2" />
          <SkeletonCard className="h-96" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SeuilsPdoForm initialRefuse={thresholdsApi.data.refuse} initialAccorde={thresholdsApi.data.accorde} onSaved={(refuse, accorde) => setRule({ refuse, accorde })} />
            <SeuilAlertePdForm initialSeuil={portfolioApi.data?.seuil_alerte_pd ?? 0.2} />
          </div>
          <div className="space-y-6">
            {currentRefuse != null && currentAccorde != null && <ActiveRuleCard refuse={currentRefuse} accorde={currentAccorde} />}
            <RhoReadOnlyCard
              critique={portfolioApi.data?.seuils_appliques?.rho_critique ?? 0.25}
              banniere={portfolioApi.data?.seuils_appliques?.rho_banniere ?? 0.42}
            />
            <FluxBPercentileReadOnlyCard percentile={percentileApi.data.percentile} />
          </div>
        </div>
      )}
    </div>
  );
}
