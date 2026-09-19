"""
export_metadata.py -- Exporte les phrases d'explication (feature_metadata) de MongoDB vers un fichier JSON.
Sert a figer les phrases generees par le LLM (Gemini) : le fichier obtenu est publie dans demo_data/
et rechargeable par import_metadata.py, sans cle API.

A lancer par l'auteur du projet. Le JSON sort sur la sortie standard, les messages sur la sortie d'erreur :
    docker compose exec -T api python scripts/export_metadata.py > demo_data/feature_metadata.json
"""
import os, sys, asyncio
from dotenv import load_dotenv
load_dotenv()

from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient


async def export_metadata():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    docs = await db.feature_metadata.find({}, {"_id": 0}).sort([("run_id", 1), ("feature", 1)]).to_list(None)
    client.close()

    if not docs:
        sys.exit("[ERREUR] Aucune phrase dans feature_metadata : rien a exporter.")

    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(json_util.dumps(docs, indent=2, ensure_ascii=False))
    sys.stdout.write("\n")
    print(f"[OK] {len(docs)} phrases exportees depuis la base '{db_name}'.", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(export_metadata())
