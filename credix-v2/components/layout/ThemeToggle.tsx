"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Bascule clair/sombre manuelle — cf. cdc_credix.md §3 ("toggle manuel, pas d'auto système"). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors",
        className
      )}
      aria-label="Basculer le thème clair/sombre"
    >
      <Icon name={isDark ? "light_mode" : "dark_mode"} size={20} />
    </button>
  );
}
