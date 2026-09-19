import { apiGet, apiPost, apiPut, apiClient } from "../api-client";
import { AdminUser, Thresholds } from "../types";

export const adminRepository = {
  getUsers: () => apiGet<{ users: AdminUser[]; total: number }>("/api/admin/users"),

  createUser: (data: {
    username: string;
    password: string;
    role: "AGENT" | "SUPERVISEUR" | "ADMIN";
    nom: string;
    prenom: string;
    email: string;
    agence?: string;
  }) => apiPost<{ user_id: string; username: string; role: string }>("/api/admin/users", data),

  toggleUser: (userId: string) => apiPut<{ user_id: string; actif: boolean }>(`/api/admin/users/${userId}/toggle`),

  getThresholds: () => apiGet<Thresholds>("/api/admin/thresholds"),

  updateThresholds: (accorde: number, refuse: number) =>
    apiPut<{ message: string; accorde: number; refuse: number }>("/api/admin/thresholds", { accorde, refuse }),

  /**
   * Seuil d'alerte PD (vue portefeuille superviseur), plage 0.05-0.80.
   * Query param côté backend, pas de body.
   */
  updateSeuilAlertePd: (seuil: number) =>
    apiPut<{ message: string; seuil_alerte_pd: number }>(`/api/admin/seuil-alerte-pd?seuil=${seuil}`),

  getFluxBPercentile: () => apiGet<{ percentile: 95 | 99 }>("/api/admin/flux-b-percentile"),

  updateFluxBPercentile: (percentile: 95 | 99) =>
    apiPut<{ message: string; percentile: number }>("/api/admin/flux-b-percentile", { percentile }),

  /**
   * Upload des 14 artefacts ML vers le backend (POST multipart/form-data).
   * Le backend crée une entrée STAGING dans MongoDB et stocke les fichiers en GridFS.
   *
   * Champs FormData attendus (4 groupes, cf. app/routers/upload_model.py) :
   *   Flux A          : woe_transformers, nap_features, lgbm_model, iv_scores, feature_stats
   *   Calibration BK.1: isotonic_calibrator, decision_config
   *   Flux B — IF     : isolation_forest, scaler_if, encoder_hybrid, if_metadata
   *   Flux B — AE     : autoencoder, ae_metadata
   *   Encodage        : colonnes_ordonnees_61
   *   + champs texte  : nom_version, description, metriques (JSON stringifié)
   *
   * ⚠️ Ne jamais fixer Content-Type manuellement — axios le définit automatiquement
   *    avec le boundary multipart correct quand on lui passe un FormData.
   */
  uploadModel: async (formData: FormData) => {
    const response = await apiClient.post<{
      run_id: string;
      statut: string;
      nb_artefacts: number;
      fichiers_recus: string[];
      message: string;
    }>("/api/admin/upload-model", formData, {
      // apiClient fixe un Content-Type: application/json par défaut sur
      // l'instance ; ce défaut gagne face à la détection automatique de
      // FormData par axios et le corps multipart part sans boundary (le
      // backend reçoit alors une requête sans aucun champ). On force sa
      // suppression pour laisser le navigateur poser le bon boundary.
      headers: { "Content-Type": undefined },
    });
    return response.data;
  },
};
