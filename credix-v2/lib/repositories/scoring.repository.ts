import { apiGet, apiPost } from "../api-client";
import { FormSchema, ScoringResult, SimulationResult, ScoringHistoryItem } from "../types";

export const scoringRepository = {
  getFormSchema: () => apiGet<FormSchema>("/api/scoring/form-schema"),

  predict: (clientId: string, declaratif: Record<string, any>) =>
    apiPost<ScoringResult>("/api/scoring/predict", { client_id: clientId, declaratif }),

  simulate: (clientId: string, declaratif: Record<string, any>) =>
    apiPost<SimulationResult>("/api/scoring/simulate", { client_id: clientId, declaratif }),

  getScoringHistory: (clientId: string, limit: number = 20) =>
    apiGet<{ client_id: string; historique: ScoringHistoryItem[]; total: number }>(
      `/api/scoring/history/${clientId}`,
      { limit }
    ),
};
