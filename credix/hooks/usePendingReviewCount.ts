'use client';

import { useEffect, useState, useCallback } from 'react';
import { decisionsRepository } from '@/lib/repositories/decisions.repository';

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
    return () => clearInterval(interval);
  }, [enabled, fetchCount]);

  return count;
}
