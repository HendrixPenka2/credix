import { apiGet, apiPost, apiClient } from "../api-client";
import { DecisionPendingReview, MyDecisionsResponse, MyOverridesResponse, OverrideStats } from "../types";

export const decisionsRepository = {
  getPendingReviews: () =>
    apiGet<{ dossiers: DecisionPendingReview[]; total: number }>("/api/decisions/pending-review"),

  overrideDecision: (demandeId: string, decision: string, commentaire: string) =>
    apiPost<{ message: string; decision: string; demande_id: string }>(`/api/decisions/${demandeId}/override`, {
      decision,
      commentaire,
    }),

  getMyDecisions: (periode: string, limit: number = 50) =>
    apiGet<MyDecisionsResponse>("/api/decisions/my-decisions", { periode, limit }),

  getOverrideStats: () => apiGet<OverrideStats>("/api/decisions/override-stats"),

  getMyOverrides: (limit: number = 50) => apiGet<MyOverridesResponse>("/api/decisions/my-overrides", { limit }),

  // Cas spécial : réponse binaire (PDF), pas de JSON — on passe par apiClient directement.
  downloadPdf: async (demandeId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/decisions/${demandeId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
};
