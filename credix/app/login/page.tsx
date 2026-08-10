'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est lancé.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">

      {/* ═══════════════════════════════════════════════
          PANNEAU GAUCHE — Image plein écran + overlay
      ═══════════════════════════════════════════════ */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">

        <Image
          src="/login.png"
          alt="CREDIX — Scoring de Risque de Crédit"
          fill
          className="object-cover object-center"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-blue-950/60 to-slate-900/80" />

        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">

          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-blue-300" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">CREDIX</span>
            </div>
            <p className="mt-2 text-xs text-blue-300/80 font-medium tracking-wider uppercase">
              Scoring de Risque de Crédit — IA Explicable
            </p>
          </div>

          {/* Tagline centré verticalement */}
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Décisions de crédit<br />
              <span className="text-blue-400">éclairées par l'IA</span>
            </h2>
            <p className="mt-3 text-slate-300/80 text-sm leading-relaxed max-w-sm">
              Système de scoring basé sur LightGBM avec explicabilité
              SHAP, couverture informationnelle ρc et gouvernance Bâle II.
            </p>
          </div>

          {/* Footer */}
          <div>
            <p className="text-xs text-slate-400/70">
              ENSPY GI2026 · IT Nearshore
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          PANNEAU DROIT — Formulaire (theme-aware)
      ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen bg-white dark:bg-slate-950">

        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-900 dark:text-white">CREDIX</span>
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle variant="login" />
        </div>

        {/* Formulaire */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Connexion
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Accédez à votre espace de scoring
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Identifiant</Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="agent.dupont"
                  disabled={isLoading}
                  icon={<User />}
                  className="h-11"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    icon={<Lock />}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={!username || !password}
                loading={isLoading}
              >
                {isLoading ? 'Connexion en cours…' : 'Se connecter'}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Backend connecté
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            CREDIX © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
