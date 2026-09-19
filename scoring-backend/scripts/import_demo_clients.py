"""
import_demo_clients.py -- Charge dans MongoDB les clients de demonstration fournis dans
demo_data/clients_demo.json (extrait de clients Home Credit, noms fictifs).
Les fichiers Kaggle ne sont pas necessaires (contrairement a seed_database.py).

Un client deja present dans la base n'est jamais modifie : on peut relancer le script
sans perdre l'historique de scoring.

Usage:
    python scripts/import_demo_clients.py
    python scripts/import_demo_clients.py --file demo_data/clients_demo.json
"""
import os, sys, asyncio, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timezone
from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient

FICHIER_DEFAUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "demo_data", "clients_demo.json")


async def import_clients(chemin):
    if not os.path.exists(chemin):
        sys.exit(f"[ERREUR] Fichier introuvable : {chemin}")

    with open(chemin, encoding="utf-8") as f:
        docs = json_util.loads(f.read())

    if not isinstance(docs, list) or not docs:
        sys.exit("[ERREUR] Le fichier doit contenir une liste non vide de clients.")
    for d in docs:
        if "client_id" not in d:
            sys.exit(f"[ERREUR] Entree invalide (champ 'client_id' obligatoire) : {str(d)[:80]}")

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    maintenant = datetime.now(timezone.utc)
    ajoutes = presents = 0
    for d in docs:
        doc = dict(d)
        doc["created_at"] = maintenant
        doc["updated_at"] = maintenant
        res = await db.clients.update_one({"client_id": doc["client_id"]}, {"$setOnInsert": doc}, upsert=True)
        if res.upserted_id is not None:
            ajoutes += 1
        else:
            presents += 1

    total = await db.clients.count_documents({})
    print(f"[OK] Clients de demonstration : {ajoutes} ajoutes, {presents} deja presents (base '{db_name}' : {total} clients au total).")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=FICHIER_DEFAUT, help="Fichier JSON a importer (defaut : demo_data/clients_demo.json)")
    args = parser.parse_args()
    asyncio.run(import_clients(args.file))
