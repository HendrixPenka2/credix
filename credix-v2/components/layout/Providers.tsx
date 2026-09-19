"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Toggle clair/sombre entièrement manuel (cf. cdc_credix.md §3 : "Mode sombre
 * complet et systématique, toggle manuel, pas d'auto système") — defaultTheme
 * fixe à "light", enableSystem désactivé.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
