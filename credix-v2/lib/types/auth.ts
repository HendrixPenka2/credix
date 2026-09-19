export type Role = "AGENT" | "SUPERVISEUR" | "ADMIN";

export interface AuthResponse {
  token: string;
  role: Role;
  user_id: string;
  nom: string;
  prenom: string;
  expires_at: string;
}

export interface ApiError {
  detail: string;
}
