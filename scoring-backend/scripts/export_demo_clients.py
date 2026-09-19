"""
export_demo_clients.py -- Exporte un extrait de clients de demonstration depuis MongoDB.
Sert a produire demo_data/clients_demo.json, rechargeable par import_demo_clients.py
sans avoir besoin des fichiers Kaggle Home Credit.

A lancer par l'auteur du projet. Le JSON sort sur la sortie standard, les messages sur la sortie d'erreur :
    docker compose exec -T api python scripts/export_demo_clients.py > demo_data/clients_demo.json

Choix des clients (deterministe, aucun tirage au hasard) parmi les clients HC- :
  1. ceux deja scores : leur dernier resultat sert de reference (affiche ici, non exporte) ;
  2. ceux aux donnees les plus incompletes : ils illustrent la couverture rho_c faible ;
  3. le reste : un echantillon regulierement espace parmi les autres clients.
Les resultats de scoring (last_score) et la couverture ne sont pas exportes : ils sont
recalcules quand on score le client.
"""
import os, sys, asyncio, argparse
from dotenv import load_dotenv
load_dotenv()

from bson import json_util
from motor.motor_asyncio import AsyncIOMotorClient

# Etat d'un client jamais score (identique a celui des clients importes par seed_database.py)
COUVERTURE_VIERGE = {"rho": 0, "sources_disponibles": [], "sources_manquantes": [], "has_history": False}


def nb_vides(client):
    return sum(1 for v in (client.get("features") or {}).values() if v is None)


def est_score(client):
    return bool((client.get("last_score") or {}).get("decision"))


def choisir(clients, n, nb_incomplets):
    """clients : liste triee par client_id. Retourne (references, incomplets, echantillon)."""
    references = [c for c in clients if est_score(c)]
    autres = [c for c in clients if not est_score(c)]
    incomplets = sorted(autres, key=lambda c: (-nb_vides(c), c["client_id"]))[:nb_incomplets]
    pris = {c["client_id"] for c in references + incomplets}
    reste = [c for c in autres if c["client_id"] not in pris]
    k = min(max(0, n - len(references) - len(incomplets)), len(reste))
    echantillon = [reste[int(i * len(reste) / k)] for i in range(k)] if k else []
    return references, incomplets, echantillon


def nettoyer(client):
    c = {k: v for k, v in client.items() if k not in ("_id", "created_at", "updated_at")}
    c["last_score"] = None
    c["coverage"] = dict(COUVERTURE_VIERGE)
    return c


async def export_clients(n, nb_incomplets):
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    clients = await db.clients.find({"client_id": {"$regex": "^HC-"}}).sort("client_id", 1).to_list(None)
    client.close()
    if not clients:
        sys.exit("[ERREUR] Aucun client HC- dans la base : rien a exporter.")

    references, incomplets, echantillon = choisir(clients, n, nb_incomplets)
    choisis = sorted(references + incomplets + echantillon, key=lambda c: c["client_id"])

    print(f"[INFO] {len(references)} clients de reference (deja scores) :", file=sys.stderr)
    for c in references:
        s = c["last_score"]
        print(f"       {c['client_id']} : {s.get('decision')} (decision initiale : {s.get('decision_initiale')}), "
              f"score {s.get('score_pdo')}, anomalie={s.get('is_anomaly')}", file=sys.stderr)
    print(f"[INFO] {len(incomplets)} clients aux donnees incompletes "
          f"({min(nb_vides(c) for c in incomplets)} a {max(nb_vides(c) for c in incomplets)} variables vides sur 27)"
          if incomplets else "[INFO] 0 client aux donnees incompletes", file=sys.stderr)
    print(f"[INFO] {len(echantillon)} clients d'echantillon regulier", file=sys.stderr)

    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(json_util.dumps([nettoyer(c) for c in choisis], indent=2, ensure_ascii=False))
    sys.stdout.write("\n")
    print(f"[OK] {len(choisis)} clients exportes depuis la base '{db_name}'.", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=150, help="Nombre total de clients exportes (defaut : 150)")
    parser.add_argument("--incomplets", type=int, default=20, help="Nombre de clients aux donnees incompletes (defaut : 20)")
    args = parser.parse_args()
    asyncio.run(export_clients(args.n, args.incomplets))
