"""
Utilitaires GridFS async pour CREDIX.
Bucket : "artefacts_ml" (séparé des collections métier).

Rôle : ce module est la SEULE couche qui touche GridFS dans tout le projet.
Toutes les opérations sur les artefacts ML (save, download, list, delete)
passent exclusivement par ces 4 fonctions.
"""
import io
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from app.db.mongodb import get_db


def get_gridfs_bucket() -> AsyncIOMotorGridFSBucket:
    """
    Retourne le bucket GridFS async nommé "artefacts_ml".
    Séparé des collections métier (clients, demandes, decisions...)
    pour éviter toute collision de nommage.
    """
    db = get_db()
    return AsyncIOMotorGridFSBucket(db, bucket_name="artefacts_ml")


async def sauvegarder_artefact(run_id: str, nom_fichier: str,
                                contenu_bytes: bytes) -> str:
    """
    Stocke un fichier binaire dans GridFS sous un run_id donné.

    Comportement idempotent : si un fichier avec le même run_id + nom_fichier
    existe déjà, il est supprimé AVANT d'uploader le nouveau.
    Cela garantit qu'un re-upload du même run_id écrase proprement l'ancien.

    Retourne l'id GridFS du fichier stocké (str).
    """
    bucket = get_gridfs_bucket()

    # Supprimer l'existant si présent (garantit l'unicité run_id+nom)
    cursor = bucket.find({
        "metadata.run_id": run_id,
        "metadata.nom_fichier": nom_fichier
    })
    async for grid_file in cursor:
        await bucket.delete(grid_file._id)

    # Uploader le nouveau fichier avec metadata de recherche
    file_id = await bucket.upload_from_stream(
        nom_fichier,
        io.BytesIO(contenu_bytes),
        metadata={"run_id": run_id, "nom_fichier": nom_fichier}
    )
    return str(file_id)


async def telecharger_artefact(run_id: str,
                                nom_fichier: str) -> bytes:
    """
    Télécharge un fichier depuis GridFS par run_id + nom_fichier.

    Utilisé dans charger_artefacts() lors d'un promote ou d'un restart :
    les bytes sont écrits dans /tmp/artefacts/{run_id}/ puis chargés
    en RAM par joblib/pickle/json selon le type d'artefact.

    Lève FileNotFoundError si le fichier est absent de GridFS.
    """
    bucket = get_gridfs_bucket()

    # Trouver le fichier par metadata
    grid_file = None
    cursor = bucket.find({
        "metadata.run_id": run_id,
        "metadata.nom_fichier": nom_fichier
    })
    async for gf in cursor:
        grid_file = gf
        break  # Unicité garantie par sauvegarder_artefact

    if grid_file is None:
        raise FileNotFoundError(
            f"Artefact introuvable dans GridFS — "
            f"run_id={run_id}, fichier={nom_fichier}"
        )

    # Télécharger dans un buffer mémoire
    buffer = io.BytesIO()
    await bucket.download_to_stream(grid_file._id, buffer)
    return buffer.getvalue()


async def lister_artefacts(run_id: str) -> list[str]:
    """
    Liste les noms de fichiers stockés pour un run_id donné.

    Utilisé par GET /model-versions pour afficher les fichiers
    disponibles dans GridFS pour chaque version STAGING/PRODUCTION.

    Retourne [] si le run_id n'existe pas dans GridFS.
    """
    bucket = get_gridfs_bucket()
    noms = []
    cursor = bucket.find({"metadata.run_id": run_id})
    async for gf in cursor:
        # Priorité à nom_fichier dans metadata, fallback sur filename GridFS
        nom = (gf.metadata.get("nom_fichier")
               if gf.metadata else None) or gf.filename
        noms.append(nom)
    return noms


async def supprimer_artefacts(run_id: str) -> int:
    """
    Supprime TOUS les fichiers GridFS associés à un run_id.

    Utilisé si l'admin rejette un upload STAGING (nettoyage propre).
    Les ids sont collectés en mémoire avant suppression pour éviter
    de modifier le curseur en cours d'itération.

    Retourne le nombre de fichiers effectivement supprimés.
    """
    bucket = get_gridfs_bucket()

    # Collecter tous les _id avant de supprimer
    ids_a_supprimer = []
    cursor = bucket.find({"metadata.run_id": run_id})
    async for gf in cursor:
        ids_a_supprimer.append(gf._id)

    for file_id in ids_a_supprimer:
        await bucket.delete(file_id)

    return len(ids_a_supprimer)