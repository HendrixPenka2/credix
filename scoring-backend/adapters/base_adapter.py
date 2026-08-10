"""
Interface abstraite — contrat que tout Data Adapter doit respecter.
Changer de source de données = implémenter cette interface.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseDataAdapter(ABC):

    @abstractmethod
    async def get_client_features(self, client_id: str) -> Dict[str, Any]:
        """
        Retourne les features historiques d'un client sous forme de dict.
        Les features non disponibles doivent être None (pas 0 !).
        """
        pass

    @abstractmethod
    async def list_all_client_ids(self) -> List[str]:
        """Retourne tous les identifiants clients disponibles (pour le seed)."""
        pass

    @abstractmethod
    async def get_client_profile(self, client_id: str) -> Dict[str, Any]:
        """Retourne les données de profil civil du client (nom, âge, emploi...)."""
        pass
