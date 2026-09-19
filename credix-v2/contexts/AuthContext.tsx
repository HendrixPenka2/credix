"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authRepository } from "@/lib/repositories/auth.repository";
import { Role } from "@/lib/types";

interface User {
  user_id: string;
  nom: string;
  prenom: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  // Évite les clignotements (hydration mismatch) au chargement de l'app.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("credix_token");
    const storedRole = localStorage.getItem("credix_role") as Role | null;
    const storedUser = localStorage.getItem("credix_user");

    if (storedToken && storedRole && storedUser) {
      setToken(storedToken);
      setRole(storedRole);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Erreur lors du parsing de l'utilisateur", e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authRepository.login({ username, password });

    const userData = {
      user_id: response.user_id,
      nom: response.nom,
      prenom: response.prenom,
    };

    setToken(response.token);
    setRole(response.role);
    setUser(userData);

    localStorage.setItem("credix_token", response.token);
    localStorage.setItem("credix_role", response.role);
    localStorage.setItem("credix_user", JSON.stringify(userData));

    if (response.role === "AGENT") router.push("/dashboard");
    else if (response.role === "SUPERVISEUR") router.push("/superviseur");
    else if (response.role === "ADMIN") router.push("/admin");
    else router.push("/");
  };

  const logout = async () => {
    try {
      if (token) {
        await authRepository.logout();
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion backend", error);
    } finally {
      setToken(null);
      setRole(null);
      setUser(null);
      localStorage.removeItem("credix_token");
      localStorage.removeItem("credix_role");
      localStorage.removeItem("credix_user");
      router.push("/login");
    }
  };

  return <AuthContext.Provider value={{ user, token, role, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
