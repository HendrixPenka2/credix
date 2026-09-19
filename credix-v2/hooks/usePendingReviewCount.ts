"use client";

import { useEffect, useState, useCallback } from "react";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";

/**
 * Nombre de dossiers en attente de revue, rafraîchi toutes les 30s.
 * Réservé aux rôles SUPERVISEUR/ADMIN (seuls concernés par la file de revue).
 */
export function usePendingReviewCount(enabled: boolean) {
  const [count, setCount] = useState<number | null>(null);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await decisionsRepository.getPendingReviews();
      setCount(res.total ?? res.dossiers?.length ?? 0);
    } catch {
      // Silencieux : un échec de polling ne doit pas casser la navigation.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    // Rafraîchissement immédiat après qu'un dossier vient d'être traité,
    // sans attendre le prochain tick des 30s — cf. retour utilisateur : la
    // cloche doit diminuer dès qu'une décision est validée.
    window.addEventListener("credix:pending-review-changed", fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("credix:pending-review-changed", fetchCount);
    };
  }, [enabled, fetchCount]);

  return count;
}
