'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  /** Variante visuelle selon le contexte d'utilisation */
  variant?: 'default' | 'login';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // Évite le flash de mauvais état au premier rendu (hydration)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ne rien rendre côté serveur pour éviter le mismatch d'hydration
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'login') {
    return (
      <button
        onClick={handleToggle}
        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        className="
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
          border border-slate-200 dark:border-slate-700
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
          text-slate-600 dark:text-slate-300
          hover:bg-slate-100 dark:hover:bg-slate-700
          transition-all duration-200
        "
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Mode clair</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-slate-500" />
            <span>Mode sombre</span>
          </>
        )}
      </button>
    );
  }

  // Variante default — icône seule pour la Topbar
  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="
        w-8 h-8 rounded-lg
        flex items-center justify-center
        text-slate-500 dark:text-slate-400
        hover:bg-slate-100 dark:hover:bg-slate-800
        border border-transparent hover:border-slate-200 dark:hover:border-slate-700
        transition-all duration-200
      "
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}