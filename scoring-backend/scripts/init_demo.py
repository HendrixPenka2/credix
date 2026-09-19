"""
init_demo.py -- Premier lancement : prepare une base vide avec tout ce qu'il faut pour tester.

Enchaine quatre etapes :
  1. le compte ADMIN                        (create_admin.py)
  2. les phrases d'explication              (import_metadata.py, sans cle API)
  3. les clients de demonstration           (import_demo_clients.py, sans fichiers Kaggle)
  4. l'enregistrement du modele fourni      (register_model.py) -- ignore si un modele PRODUCTION existe deja

Le script peut etre relance sans creer de doublons. Le mot de passe admin n'est ecrit nulle part :
passe-le par la variable ADMIN_PASSWORD (8 caracteres minimum) ou saisis-le au clavier.

Usage (API deja demarree, depuis le dossier scoring-backend) :
    docker compose exec -T -e ADMIN_PASSWORD="VotreMotDePasse" api python scripts/init_demo.py
Puis, pour que l'API recharge les phrases d'explication :
    docker compose restart api
"""
import os, sys, argparse, subprocess
from dotenv import load_dotenv
load_dotenv()

from pymongo import MongoClient

DOSSIER_SCRIPTS = os.path.dirname(os.path.abspath(__file__))

# Metriques de test du modele fourni dans artefacts/ (source : son enregistrement dans la base de l'auteur)
MODELE = {"run_id": "lgbm-run-v1", "version": "1.0.0", "auc": "0.751", "gini": "0.502", "ks": "0.3732"}


def lancer(titre, script, *args):
    print(f"\n=== {titre} ===", flush=True)
    resultat = subprocess.run([sys.executable, os.path.join(DOSSIER_SCRIPTS, script), *args])
    if resultat.returncode != 0:
        sys.exit(f"\n[ERREUR] L'etape '{titre}' a echoue (code {resultat.returncode}). "
                 "Corrige le probleme puis relance ce script : il est rejouable.")


def modele_production_existe():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        existe = client[db_name].modeles.count_documents({"statut": "PRODUCTION"}) > 0
        client.close()
        return existe
    except Exception as e:
        sys.exit(f"[ERREUR] MongoDB injoignable ({mongo_uri}) : {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--admin-username", default="admin")
    parser.add_argument("--admin-password", default=None,
                        help="Mot de passe du compte ADMIN. A defaut : variable ADMIN_PASSWORD, sinon saisie au clavier.")
    args = parser.parse_args()

    mot_de_passe = args.admin_password or os.getenv("ADMIN_PASSWORD")
    if mot_de_passe:
        os.environ["ADMIN_PASSWORD"] = mot_de_passe  # transmis a create_admin.py sans apparaitre dans la ligne de commande
    elif not sys.stdin.isatty():
        sys.exit("[ERREUR] Mot de passe ADMIN manquant : definis ADMIN_PASSWORD "
                 "(ex. : docker compose exec -T -e ADMIN_PASSWORD=\"...\" api python scripts/init_demo.py).")

    lancer("1/4 Compte administrateur", "create_admin.py", "--username", args.admin_username)
    lancer("2/4 Phrases d'explication", "import_metadata.py")
    lancer("3/4 Clients de demonstration", "import_demo_clients.py")

    if modele_production_existe():
        print("\n=== 4/4 Enregistrement du modele ===", flush=True)
        print("[INFO] Un modele PRODUCTION existe deja : etape ignoree.")
    else:
        lancer("4/4 Enregistrement du modele", "register_model.py",
               "--run-id", MODELE["run_id"], "--version", MODELE["version"], "--promote",
               "--auc", MODELE["auc"], "--gini", MODELE["gini"], "--ks", MODELE["ks"])

    print("\n[OK] Initialisation terminee.")
    print("     Derniere etape : docker compose restart api   (pour que l'API recharge les phrases d'explication)")
