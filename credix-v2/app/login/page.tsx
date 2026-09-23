"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Identifiant ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-surface text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Panneau gauche — image immersive (masqué en mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <Image
          src="/login.png"
          alt="Credix AI — Scoring de risque de crédit"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-blue-950/60 to-slate-900/80" />
        <div className="relative z-10 flex flex-col justify-between p-margin-page h-full w-full">
          <div className="flex items-center gap-stack-sm text-slate-50">
            <Icon name="analytics" filled size={40} />
            <span className="font-headline-lg font-bold tracking-tight">Credix AI</span>
          </div>
          <div className="max-w-md">
            <h1 className="font-display-lg text-slate-50 mb-stack-md leading-tight">
              L&apos;intelligence artificielle au service du crédit responsable
            </h1>
            <p className="font-body-md text-slate-200 opacity-80">
              Système d&apos;évaluation des risques nouvelle génération, alliant puissance algorithmique et explicabilité (XAI).
            </p>
          </div>
          <div className="flex items-center justify-between font-label-md text-slate-400 border-t border-slate-700/50 pt-stack-md">
            <span>© 2026 Credix Technologies</span>
            <div className="flex gap-stack-md">
              <span>Plateforme interne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-margin-page relative bg-surface">
        <div className="absolute top-margin-page right-margin-page flex items-center gap-stack-md">
          <div className="flex items-center gap-unit bg-success-emerald/10 text-success-emerald px-stack-sm py-unit rounded-full font-label-md border border-success-emerald/20">
            <span className="w-2 h-2 rounded-full bg-success-emerald animate-pulse" />
            Système opérationnel
          </div>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-stack-sm mb-margin-page justify-center text-on-surface">
            <Icon name="analytics" filled size={28} />
            <span className="font-headline-sm font-bold">Credix AI</span>
          </div>
          <div className="mb-gutter">
            <h2 className="font-headline-lg text-on-surface mb-1">Bienvenue</h2>
            <p className="font-body-md text-on-surface-variant">Veuillez saisir vos identifiants pour accéder au portail d&apos;analyse.</p>
          </div>

          <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-on-surface-variant mb-1" htmlFor="username">
                Identifiant ou Email
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="analyste@credix.com"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<Icon name="person" size={18} />}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-label-md text-on-surface-variant" htmlFor="password">
                  Mot de passe
                </label>
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Icon name="lock" size={18} />}
                trailing={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="pointer-events-auto">
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                }
              />
            </div>

            {error && (
              <div className="flex items-center gap-stack-sm text-danger-rose font-body-sm bg-danger-rose/10 p-stack-sm rounded-lg border border-danger-rose/20">
                <Icon name="error" size={18} />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
              Se connecter
              <Icon name="arrow_forward" size={16} />
            </Button>
          </form>

          <div className="mt-margin-page text-center">
            <p className="font-body-sm text-on-surface-variant">
              Accès restreint aux utilisateurs autorisés. Toute tentative d&apos;accès non autorisée est surveillée et journalisée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
