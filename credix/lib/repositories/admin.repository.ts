// DESTINATION: lib/repositories/admin.repository.ts
// (patch — ajoute updateSeuilAlertePd, qui manquait pour la page 4.4.
// L'endpoint backend PUT /api/admin/seuil-alerte-pd attend un query param
// `seuil`, pas un body JSON — d'où l'URL construite directement.
// Remplace le fichier existant.)
import { apiGet, apiPost, apiPut } from '../api-client';
import { apiClient } from '../api-client';
import { AdminUser, Thresholds } from '../types';

export const adminRepository = {
  getUsers: () =>
    apiGet<{ users: AdminUser[]; total: number }>('/api/admin/users'),

  createUser: (data: any) =>
    apiPost<{ user_id: string; username: string; role: string }>('/api/admin/users', data),

  toggleUser: (userId: string) =>
    apiPut<{ user_id: string; actif: boolean }>(`/api/admin/users/${userId}/toggle`),

  getThresholds: () =>
    apiGet<Thresholds>('/api/admin/thresholds'),

  updateThresholds: (accorde: number, refuse: number) =>
    apiPut<{ message: string; accorde: number; refuse: number }>(
      '/api/admin/thresholds',
      { accorde, refuse }
    ),

  /**
   * Seuil d'alerte PD (vue portefeuille superviseur). Plage : 0.05 → 0.80.
   * Query param côté backend, pas de body — on le passe directement dans l'URL.
   */
  updateSeuilAlertePd: (seuil: number) =>
    apiPut<{ message: string; seuil_alerte_pd: number }>(
      `/api/admin/seuil-alerte-pd?seuil=${seuil}`
    ),

  /**
   * Upload des 11 artefacts ML vers le backend (POST multipart/form-data)
   * Le backend crée une entrée STAGING dans MongoDB et stocke les fichiers en GridFS.
   *
   * Champs FormData attendus :
   *   woe_transformers, nap_features, lgbm_model, iv_scores, feature_stats,
   *   isolation_forest, scaler_if, encoder_if, if_metadata,
   *   autoencoder, ae_metadata, nom_version, description, metriques
   *
   * ⚠️ NE PAS passer Content-Type manuellement — axios le définit automatiquement
   *    avec le boundary multipart correct quand on lui passe un FormData.
   */
  uploadModel: async (formData: FormData) => {
    const response = await apiClient.post<{
      run_id: string;
      message: string;
      statut: string;
      nom_version: string;
    }>('/api/admin/upload-model', formData);
    return response.data;
  },
};

// END OF FILE: lib/repositories/admin.repository.ts