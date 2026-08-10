"""
register_model.py -- Enregistre un modele dans MongoDB apres entrainement.
Lance apres generate_metadata.py pour creer le document modele en STAGING.

Usage:
    python scripts/register_model.py --run-id lgbm-run-v1 --version 1.0.0
    python scripts/register_model.py --run-id lgbm-run-v1 --version 1.0.0 --promote
"""
import os, sys, asyncio, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


async def register(run_id, version, promote=False, auc=None, gini=None, ks=None):
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    artefacts_dir = os.getenv("ARTEFACTS_DIR", "./artefacts")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    now = datetime.now(timezone.utc)

    statut = "PRODUCTION" if promote else "STAGING"

    if promote:
        await db.modeles.update_many({"statut": "PRODUCTION"}, {"$set": {"statut": "ARCHIVE"}})

    doc = {
        "run_id": run_id,
        "version": version,
        "statut": statut,
        "date_entrainement": now,
        "metriques": {
            "auc": auc or 0.0,
            "gini": gini or 0.0,
            "ks": ks or 0.0,
        },
        "artefacts_paths": {
            "lgbm": f"{artefacts_dir}/lgbm_final.pkl",
            "woe": f"{artefacts_dir}/woe_transformers.pkl",
            "nap": f"{artefacts_dir}/nap_features.pkl",
            "iv": f"{artefacts_dir}/iv_scores_final.csv",
            "stats": f"{artefacts_dir}/feature_stats.json",
        },
        "promoted_by": "admin" if promote else None,
        "promoted_at": now if promote else None,
    }

    await db.modeles.update_one(
        {"run_id": run_id},
        {"$set": doc},
        upsert=True
    )

    await db.admin_config.update_one(
        {"type": "modele_actif"},
        {"$set": {"run_id": run_id, "version": version, "updated_at": now}},
        upsert=True
    )

    print(f"[OK] Modele enregistre: run_id={run_id} version={version} statut={statut}")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", default="lgbm-run-v1")
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--promote", action="store_true", help="Promouvoir directement en PRODUCTION")
    parser.add_argument("--auc", type=float, default=None)
    parser.add_argument("--gini", type=float, default=None)
    parser.add_argument("--ks", type=float, default=None)
    args = parser.parse_args()
    asyncio.run(register(args.run_id, args.version, args.promote, args.auc, args.gini, args.ks))
