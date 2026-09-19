import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";

// On récupère l'URL depuis le .env.local, avec un fallback de sécurité
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// INTERCEPTEUR DE REQUÊTE : injection automatique du token JWT
// ============================================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("credix_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// INTERCEPTEUR DE RÉPONSE : gestion globale des erreurs HTTP
// ============================================================================
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<any>) => {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail;

      switch (status) {
        case 401:
          // On distingue l'expiration du token de la simple erreur de login.
          if (detail === "Token invalide ou expiré") {
            if (typeof window !== "undefined") {
              console.warn("Session expirée. Déconnexion forcée...");
              localStorage.removeItem("credix_token");
              localStorage.removeItem("credix_role");
              localStorage.removeItem("credix_user");
              window.location.href = "/login";
            }
          } else {
            console.warn("Erreur d'authentification :", detail);
          }
          break;
        case 403:
          console.error("Accès non autorisé (403) :", detail);
          break;
        case 404:
          console.error("Ressource introuvable (404) :", detail);
          break;
        case 500:
        case 502:
        case 503:
          console.error("Erreur serveur backend (5xx) :", detail);
          break;
      }
    } else if (error.request) {
      console.error("Le backend est injoignable. Vérifiez qu'il tourne bien.");
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// HELPERS GÉNÉRIQUES — toujours passer par ceux-ci depuis les repositories
// (sauf cas spéciaux : blob, FormData, qui utilisent apiClient directement)
// ============================================================================

export async function apiGet<T>(url: string, params?: any): Promise<T> {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
}

export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.post<T>(url, data);
  return response.data;
}

export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.put<T>(url, data);
  return response.data;
}

export async function apiPatch<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.patch<T>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url);
  return response.data;
}
