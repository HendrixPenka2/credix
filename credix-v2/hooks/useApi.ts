import { useState, useEffect, useCallback } from "react";

interface UseApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook générique pour gérer les appels API avec chargement/erreur automatiques.
 * @param apiFunc La fonction du repository à appeler (ex: adminRepository.getUsers)
 * @param immediate Faut-il lancer l'appel immédiatement au montage ? (défaut: true)
 */
export function useApi<T>(apiFunc: () => Promise<T>, immediate: boolean = true): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc();
      setData(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Une erreur est survenue lors du chargement des données.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFunc]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate]);

  return { data, loading, error, refetch: execute };
}
