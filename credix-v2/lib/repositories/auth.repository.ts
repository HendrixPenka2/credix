import { apiPost } from "../api-client";
import { AuthResponse } from "../types";

export const authRepository = {
  login: (data: { username: string; password: string }) => apiPost<AuthResponse>("/api/auth/login", data),
  logout: () => apiPost<{ message: string }>("/api/auth/logout"),
};
