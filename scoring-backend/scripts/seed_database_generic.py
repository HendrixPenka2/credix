"""
seed_database_generic.py — ETL initial GenericAdapter → MongoDB

Identique à seed_database.py mais utilise GenericAdapter au lieu de HomeCreditAdapter.
Le fichier seed_database.py original reste INTACT et fonctionnel.

ATTENTION : Exécuter UNIQUEMENT après avoir validé le test d'équivalence :
    python tests/test_adapter_equivalence.py

Si le test passe (✅), ce script produit exactement le même résultat que
seed_database.py. Si le test échoue (❌), NE PAS lancer ce script.

Usage :
    python scripts/seed_database_generic.py
    python scripts/seed_database_generic.py --limit 500
    python scripts/seed_database_generic.py --reset
"""
import os
import sys
import asyncio
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import numpy as np
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from adapters.generic_adapter import GenericAdapter


def _sanitize(obj):
    """Convertit récursivement les types numpy en types Python natifs pour pymongo.
    Identique à seed_database.py._sanitize().
    """
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


async def seed(limit=None, reset=False):
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name   = os.getenv("MONGO_DB_NAME", "scoring_db")
    data_dir  = os.getenv("HOME_CREDIT_DATA_DIR", "")

    if not data_dir or data_dir == "METTRE_LE_CHEMIN_ICI":
        print("ERREUR: HOME_CREDIT_DATA_DIR n'est pas configuré dans .env")
        print("  Ouvre .env et définis : HOME_CREDIT_DATA_DIR=/chemin/vers/csv")
        sys.exit(1)

    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "configs", "adapter_config_home_credit.yaml",
    )
    if not os.path.exists(config_path):
        print(f"ERREUR: Fichier YAML introuvable : {config_path}")
        print(f"  Chemin attendu : {config_path}")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    if reset:
        print("[RESET] Suppression collection clients...")
        await db.clients.drop()

    existing = await db.clients.count_documents({})
    if existing > 0 and not reset:
        print(f"[INFO] {existing} clients déjà en base.")
        print("  Utilise --reset pour recommencer depuis zéro.")
        return

    # ── GenericAdapter (remplace HomeCreditAdapter) ───────────────────────
    adapter = GenericAdapter(config_path, data_dir)
    adapter.load_data()
    # ─────────────────────────────────────────────────────────────────────

    all_ids = await adapter.list_all_client_ids()
    if limit:
        all_ids = all_ids[:limit]
    total = len(all_ids)
    print(f"[SEED] {total} clients à insérer...")

    batch   = []
    inserted = 0
    errors  = 0

    for i, client_id in enumerate(all_ids):
        try:
            profile  = await adapter.get_client_profile(client_id)
            features = await adapter.get_client_features(client_id)
            has_hist = features.get("has_history", 0) == 1

            profile  = _sanitize(profile)
            features = _sanitize(features)

            doc = {
                "client_id"  : client_id,
                "created_at" : datetime.now(timezone.utc),
                "updated_at" : datetime.now(timezone.utc),
                "profile"    : profile,
                "coverage"   : {
                    "rho"                  : 0.0,
                    "sources_disponibles"  : [],
                    "sources_manquantes"   : [],
                    "has_history"          : has_hist,
                },
                "features"      : features,
                "last_score"    : None,
                "is_new_client" : False,
            }
            batch.append(doc)

            if len(batch) >= 500:
                await db.clients.insert_many(batch, ordered=False)
                inserted += len(batch)
                batch = []
                print(f"  {inserted}/{total} insérés...")

        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  [ERREUR] client {client_id}: {e}")

    if batch:
        await db.clients.insert_many(batch, ordered=False)
        inserted += len(batch)

    await db.clients.create_index("client_id", unique=True)
    print(f"[SEED] Terminé : {inserted} clients insérés, {errors} erreurs")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ETL Home Credit → MongoDB via GenericAdapter"
    )
    parser.add_argument("--limit", type=int, default=None,
                        help="Nombre max de clients à insérer")
    parser.add_argument("--reset", action="store_true",
                        help="Vider la collection clients avant l'insertion")
    args = parser.parse_args()
    asyncio.run(seed(args.limit, args.reset))