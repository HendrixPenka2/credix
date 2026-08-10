import { useState, useEffect, useCallback } from 'react';

interface UseApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook générique pour gérer les appels API avec gestion automatique
 * du chargement (loading) et des erreurs (error).
 * 
 * @param apiFunc La fonction du repository à appeler (ex: adminRepository.getUsers)
 * @param immediate Faut-il lancer l'appel immédiatement au montage du composant ? (défaut: true)
 */
export function useApi<T>(
  apiFunc: () => Promise<T>,
  immediate: boolean = true
): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  // useCallback mémorise la fonction pour pouvoir la réutiliser (ex: bouton "Actualiser")
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc();
      setData(result);
    } catch (err: any) {
      // On extrait le message d'erreur spécifique de FastAPI s'il existe
      const errorMessage = err.response?.data?.detail || err.message || "Une erreur est survenue lors du chargement des données.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { data, loading, error, refetch: execute };
}