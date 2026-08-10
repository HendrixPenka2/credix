"""
create_admin.py -- Cree le premier compte ADMIN dans MongoDB.
Lance ce script apres seed_database.py et avant de demarrer le backend.

Usage:
    python scripts/create_admin.py
    python scripts/create_admin.py --username admin --password MonMotDePasse123
"""
import os, sys, asyncio, argparse, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin(username, password):
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    existing = await db.utilisateurs.find_one({"username": username})
    if existing:
        print(f"[INFO] L'utilisateur '{username}' existe deja.")
        client.close()
        return

    user_id = str(uuid.uuid4())
    doc = {
        "user_id": user_id,
        "username": username,
        "password_hash": pwd_context.hash(password),
        "role": "ADMIN",
        "actif": True,
        "profil": {"nom": "Administrateur", "prenom": "Systeme", "email": "admin@scoring.local", "agence": "Siege"},
        "token": {"jwt_token": None, "expires_at": None},
        "statistiques": {"nb_demandes_soumises": 0, "nb_decisions_accordees": 0, "nb_decisions_refusees": 0, "nb_decisions_revue": 0, "nb_overrides_superviseur": 0, "derniere_connexion": None},
        "created_at": datetime.now(timezone.utc),
        "created_by": "system",
    }

    await db.utilisateurs.create_index("username", unique=True)
    await db.utilisateurs.insert_one(doc)
    print(f"[OK] Admin cree: username='{username}' / role=ADMIN")
    print(f"     user_id: {user_id}")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="Admin2026!")
    args = parser.parse_args()
    asyncio.run(create_admin(args.username, args.password))
