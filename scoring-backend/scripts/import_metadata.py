"""
import_metadata.py -- Charge dans MongoDB les phrases d'explication (feature_metadata)
fournies dans demo_data/feature_metadata.json. Aucune cle API n'est necessaire
(contrairement a generate_metadata.py, qui les regenere avec un LLM).

Par defaut, seules les phrases absentes de la base sont ajoutees : celles qui existent
deja sont conservees. Avec --force, elles sont remplacees par celles du fichier.

Usage:
    python scripts/import_metadata.py
    python scripts/import_metadata.py --file demo_data/feature_metadata.json --force

Apres l'import, redemarre l'API pour qu'elle recharge les phrases en memoire :
    docker compose restart api
"""
import os, sys, asyncio, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient

FICHIER_DEFAUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "demo_data", "feature_metadata.json")


async def import_metadata(chemin, force=False):
    if not os.path.exists(chemin):
        sys.exit(f"[ERREUR] Fichier introuvable : {chemin}")

    with open(chemin, encoding="utf-8") as f:
        docs = json_util.loads(f.read())

    if not isinstance(docs, list) or not docs:
        sys.exit("[ERREUR] Le fichier doit contenir une liste non vide de phrases.")
    for d in docs:
        if "feature" not in d or "run_id" not in d:
            sys.exit(f"[ERREUR] Entree invalide (champs 'feature' et 'run_id' obligatoires) : {str(d)[:80]}")

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    ajoutees = remplacees = conservees = 0
    for d in docs:
        filtre = {"run_id": d["run_id"], "feature": d["feature"]}
        if force:
            res = await db.feature_metadata.update_one(filtre, {"$set": d}, upsert=True)
        else:
            res = await db.feature_metadata.update_one(filtre, {"$setOnInsert": d}, upsert=True)
        if res.upserted_id is not None:
            ajoutees += 1
        elif res.modified_count:
            remplacees += 1
        else:
            conservees += 1

    total = await db.feature_metadata.count_documents({})
    print(f"[OK] Phrases d'explication : {ajoutees} ajoutees, {remplacees} remplacees, {conservees} deja presentes (base '{db_name}' : {total} au total).")
    if ajoutees or remplacees:
        print("     Redemarre l'API pour qu'elle les recharge : docker compose restart api")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=FICHIER_DEFAUT, help="Fichier JSON a importer (defaut : demo_data/feature_metadata.json)")
    parser.add_argument("--force", action="store_true", help="Remplace les phrases deja presentes")
    args = parser.parse_args()
    asyncio.run(import_metadata(args.file, args.force))
