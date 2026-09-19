import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getDecisionStyle, getRhoStyle } from "@/lib/design-tokens";

/** Fusion de classes Tailwind — seule définition dans tout le repo, à importer partout. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Libellé affichable d'une décision (ACCORDE → "ACCORDÉ", etc.) — dérivé de design-tokens. */
export function decisionLabel(decision: string): string {
  return getDecisionStyle(decision).label;
}

export function formatRho(rho: number): string {
  return `${Math.round(rho * 100)}%`;
}

export function rhoColorClass(rho: number): string {
  return getRhoStyle(rho).badge;
}

export function formatPd(pd: number): string {
  return `${(pd * 100).toFixed(2)}%`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatScore(score: number): string {
  return Math.round(score).toString();
}
