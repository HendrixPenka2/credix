import { apiGet } from "../api-client";
import {
  DashboardStatistics,
  ScoreDistribution,
  PortfolioRisk,
  ScoreBands,
  PercentileData,
  AnomalyStatistics,
} from "../types";

export const dashboardRepository = {
  getStatistics: (periode: string) => apiGet<DashboardStatistics>("/api/dashboard/statistics", { periode }),

  getScoreDistribution: (periode: string) =>
    apiGet<ScoreDistribution>("/api/dashboard/score-distribution", { periode }),

  getClientPercentile: (clientId: string, demandeId: string) =>
    apiGet<PercentileData>(`/api/dashboard/client-percentile/${clientId}/${demandeId}`),

  getPortfolioRisk: (periode: string) => apiGet<PortfolioRisk>("/api/dashboard/portfolio-risk", { periode }),

  getScoreBands: (periode: string) => apiGet<ScoreBands>("/api/dashboard/score-bands", { periode }),

  getAnomalyStatistics: (periode: string) =>
    apiGet<AnomalyStatistics>("/api/dashboard/anomaly-statistics", { periode }),
};
