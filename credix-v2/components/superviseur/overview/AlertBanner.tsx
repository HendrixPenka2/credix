import { Banner, type BannerVariant } from "@/components/shared/Banner";
import type { PortfolioRisk } from "@/lib/types";

const VARIANT_BY_NIVEAU: Record<string, BannerVariant> = {
  CRITIQUE: "critical",
  ÉLEVÉ: "critical",
  ATTENTION: "warning",
};

export function AlertBanner({ portfolioRisk }: { portfolioRisk: PortfolioRisk }) {
  if (!portfolioRisk.alerte) return null;
  return <Banner variant={VARIANT_BY_NIVEAU[portfolioRisk.niveau_alerte ?? ""] ?? "warning"} title="Alerte portefeuille" description={portfolioRisk.alerte} />;
}
