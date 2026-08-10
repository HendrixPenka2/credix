from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongo_uri)
    _db = _client[settings.mongo_db_name]
    # Crée les index nécessaires
    await _db.clients.create_index("client_id", unique=True)
    await _db.utilisateurs.create_index("username", unique=True)
    await _db.utilisateurs.create_index("user_id", unique=True)
    await _db.demandes.create_index("demande_id", unique=True)
    await _db.demandes.create_index([("client_id", 1), ("timestamp", -1)])
    await _db.decisions.create_index("demande_id", unique=True)
    await _db.decisions.create_index([("timestamp", -1)])
    await _db.feature_metadata.create_index([("run_id", 1), ("feature", 1)])
    await _db.audit_logs.create_index([("user_id", 1), ("timestamp", -1)])
    print(f"[DB] Connecté à MongoDB : {settings.mongo_db_name}")


async def disconnect_db():
    global _client
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    return _db
