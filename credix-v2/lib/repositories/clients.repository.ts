import { apiGet, apiPost, apiPatch } from "../api-client";
import { Client, ClientSearchResult, ScoreProgression } from "../types";

export const clientsRepository = {
  searchClients: (params: {
    q?: string;
    rho_min?: number;
    rho_max?: number;
    decision_derniere?: string;
    limit?: number;
  }) => apiGet<{ clients: ClientSearchResult[]; total: number; filtres_actifs: any }>("/api/clients/search", params),

  getClientById: (clientId: string) => apiGet<Client>(`/api/clients/${clientId}`),

  createClient: (data: any) =>
    apiPost<{ client_id: string; message: string; is_new_client: boolean; has_history: boolean }>(
      "/api/clients",
      data
    ),

  updateClientProfile: (clientId: string, data: any) =>
    apiPatch<{ client_id: string; message: string; champs_modifies: string[] }>(`/api/clients/${clientId}`, data),

  getScoreProgression: (clientId: string) => apiGet<ScoreProgression>(`/api/clients/${clientId}/score-progression`),

  getRecentlyScored: (limit: number = 10) =>
    apiGet<{ clients: ClientSearchResult[]; total: number }>("/api/clients/recently-scored", { limit }),
};
