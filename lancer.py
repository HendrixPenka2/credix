#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lance tout le projet CREDIX en une seule commande : le backend (Docker) puis
le frontend (Next.js), avec les données de démonstration déjà chargées.

Usage :
    Ubuntu / macOS :  python3 lancer.py
    Windows          :  python lancer.py

Ce script ne fait rien de plus que ce que le README explique pas à pas dans
ses sections 3 à 7 : il enchaîne les mêmes commandes automatiquement. Pour
comprendre chaque étape, ou si quelque chose ne fonctionne pas, lisez le
README (section 10, dépannage).

Ne demande RIEN d'autre que Python : aucune bibliothèque à installer
(pip install ...). Docker, Docker Compose et Node.js (avec npm) doivent en
revanche déjà être installés (README, section 3).
"""

import json
import os
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

# --------------------------------------------------------------------------
# Réglages
# --------------------------------------------------------------------------

RACINE = Path(__file__).resolve().parent
DOSSIER_BACKEND = RACINE / "scoring-backend"
DOSSIER_FRONTEND = RACINE / "credix-v2"

PORT_FRONTEND = 3001
URL_SANTE_API = "http://localhost:8080/health"
URL_FRONTEND = f"http://localhost:{PORT_FRONTEND}"
URL_DOC_API = "http://localhost:8080/docs"

# Mot de passe du compte administrateur créé automatiquement (les comptes
# agent.test et superviseur.test, eux, se créent à la main : README 7.2).
# Modifiable sans toucher au script : ADMIN_PASSWORD=... python3 lancer.py
MOT_DE_PASSE_ADMIN = os.environ.get("ADMIN_PASSWORD", "Demo12345")

TIMEOUT_API_SECONDES = 300          # attente de /health après le démarrage des conteneurs
DELAI_ENTRE_ESSAIS_SECONDES = 3
TIMEOUT_ARRET_FRONTEND_SECONDES = 10


# --------------------------------------------------------------------------
# Utilitaires
# --------------------------------------------------------------------------

def titre(texte):
    print(f"\n=== {texte} ===")


def executer(commande, cwd=None, arret_si_echec=True):
    """Lance une commande externe, sortie affichée en direct (pas capturée).

    Résout l'exécutable avec shutil.which() : sous Windows, cela retrouve
    correctement les scripts .cmd/.bat (comme npm), ce qu'un simple
    subprocess.run(["npm", ...]) sans shell=True ne garantit pas toujours.
    """
    exe = shutil.which(commande[0])
    if exe is None:
        sys.exit(
            f"\n[ERREUR] Commande introuvable : « {commande[0]} ».\n"
            "Vérifiez qu'elle est installée et accessible (README, section 3)."
        )
    ligne = " ".join(commande)
    print(f"\n$ {ligne}", flush=True)
    try:
        resultat = subprocess.run([exe, *commande[1:]], cwd=cwd, shell=False)
    except OSError as erreur:
        sys.exit(f"\n[ERREUR] Impossible de lancer « {commande[0]} » : {erreur}")
    if arret_si_echec and resultat.returncode != 0:
        sys.exit(
            f"\n[ERREUR] La commande a échoué (code {resultat.returncode}) : {ligne}\n"
            "Voir la section 10 (dépannage) du README.md."
        )
    return resultat


# --------------------------------------------------------------------------
# Étape 1 : prérequis
# --------------------------------------------------------------------------

PREREQUIS = [
    {"nom": "Docker", "commande": ["docker", "--version"]},
    {"nom": "Docker Compose (sous-commande « docker compose »)", "commande": ["docker", "compose", "version"]},
    {"nom": "Node.js", "commande": ["node", "--version"]},
    {"nom": "npm", "commande": ["npm", "--version"]},
]


def verifier_prerequis():
    titre("Étape 1/6 : vérification des outils nécessaires")
    manquants = []
    for prereq in PREREQUIS:
        exe = shutil.which(prereq["commande"][0])
        ok = False
        if exe is not None:
            try:
                resultat = subprocess.run(
                    [exe, *prereq["commande"][1:]],
                    capture_output=True, text=True, timeout=15, shell=False,
                )
                ok = resultat.returncode == 0
            except (OSError, subprocess.TimeoutExpired):
                ok = False
        print(f"  [{'OK' if ok else 'MANQUANT'}] {prereq['nom']}")
        if not ok:
            manquants.append(prereq["nom"])

    if manquants:
        print("\n[ERREUR] Outil(s) manquant(s) ou non fonctionnel(s) :")
        for nom in manquants:
            print(f"  - {nom}")
        print(
            "\nConsultez la section 3 du README.md : « Ce qu'il faut installer avant de commencer ».\n"
            "  - Ubuntu / Debian : voir la sous-section 3.4 (commandes testées).\n"
            "  - Windows (non testé dans le README) : installez Docker Desktop "
            "(docker.com/products/docker-desktop) et Node.js LTS (nodejs.org), "
            "puis relancez ce script dans un NOUVEAU terminal."
        )
        sys.exit(1)


# --------------------------------------------------------------------------
# Étape 2 : fichiers .env
# --------------------------------------------------------------------------

def creer_fichier_env(exemple: Path, destination: Path, transformation=None):
    """Copie exemple -> destination, seulement si destination n'existe pas
    encore. Un fichier .env déjà présent n'est JAMAIS écrasé (il peut
    contenir des réglages choisis par la personne qui l'a lancé avant)."""
    if destination.exists():
        print(f"  [OK] {destination.name} existe déjà (dans {destination.parent.name}/) : conservé sans modification.")
        return
    if not exemple.exists():
        sys.exit(f"[ERREUR] Fichier modèle introuvable : {exemple}")
    contenu = exemple.read_text(encoding="utf-8")
    if transformation is not None:
        contenu = transformation(contenu)
    destination.write_text(contenu, encoding="utf-8", newline="\n")
    print(f"  [OK] {destination.name} créé à partir de {exemple.name} (dans {destination.parent.name}/).")


def inserer_jwt_secret_aleatoire(contenu: str) -> str:
    """Remplace la valeur de JWT_SECRET par 64 caractères hexadécimaux
    aléatoires, générés en Python pur (équivalent à openssl rand -hex 32,
    sans dépendre d'OpenSSL)."""
    cle = secrets.token_hex(32)
    nouveau, nb = re.subn(r"^JWT_SECRET=.*$", f"JWT_SECRET={cle}", contenu, count=1, flags=re.MULTILINE)
    if nb == 0:
        sys.exit("[ERREUR] La ligne JWT_SECRET= est introuvable dans scoring-backend/.env.example.")
    return nouveau


def preparer_env_backend():
    titre("Étape 2/6 : préparation du fichier de configuration du backend")
    creer_fichier_env(
        DOSSIER_BACKEND / ".env.example",
        DOSSIER_BACKEND / ".env",
        transformation=inserer_jwt_secret_aleatoire,
    )


def preparer_env_frontend():
    creer_fichier_env(
        DOSSIER_FRONTEND / ".env.example",
        DOSSIER_FRONTEND / ".env.local",
    )


# --------------------------------------------------------------------------
# Étape 4 : attendre que l'API réponde
# --------------------------------------------------------------------------

def attendre_api_prete(timeout=TIMEOUT_API_SECONDES):
    print(f"Attente de l'API sur {URL_SANTE_API} (jusqu'à {timeout // 60} minutes)...")
    debut = time.time()
    derniere_erreur = None
    while time.time() - debut < timeout:
        try:
            with urllib.request.urlopen(URL_SANTE_API, timeout=5) as reponse:
                donnees = json.loads(reponse.read().decode("utf-8"))
                if donnees.get("statut") == "ok":
                    print(f"  [OK] L'API répond (après {int(time.time() - debut)} s).")
                    return donnees
                derniere_erreur = f"réponse inattendue : {donnees}"
        except (urllib.error.URLError, OSError, ValueError) as erreur:
            derniere_erreur = erreur
        time.sleep(DELAI_ENTRE_ESSAIS_SECONDES)
    sys.exit(
        f"\n[ERREUR] L'API ne répond pas correctement après {timeout // 60} minutes.\n"
        f"Dernière erreur rencontrée : {derniere_erreur}\n\n"
        "Pistes de dépannage (depuis scoring-backend/) :\n"
        "    docker compose ps\n"
        "    docker compose logs --tail 100 api\n"
        "Voir aussi la section 10 (dépannage) du README.md."
    )


# --------------------------------------------------------------------------
# Étape 5 : données de démonstration
# --------------------------------------------------------------------------

def initialiser_donnees_demo():
    titre("Étape 5/6 : chargement des données de démonstration")
    print(
        "  Compte administrateur, 27 phrases d'explication, 150 clients fictifs\n"
        "  et enregistrement du modèle en production (script relançable sans danger)."
    )
    executer(
        ["docker", "compose", "exec", "-T", "-e", f"ADMIN_PASSWORD={MOT_DE_PASSE_ADMIN}",
         "api", "python", "scripts/init_demo.py"],
        cwd=DOSSIER_BACKEND,
    )
    print("\n  Redémarrage de l'API pour qu'elle recharge les phrases d'explication...")
    executer(["docker", "compose", "restart", "api"], cwd=DOSSIER_BACKEND)
    executer(
        ["docker", "compose", "up", "-d", "--wait", "--wait-timeout", "240", "api"],
        cwd=DOSSIER_BACKEND,
    )
    donnees = attendre_api_prete(timeout=90)
    metadata = donnees.get("metadata_chargees", 0)
    if metadata:
        print(f"  [OK] {metadata} phrases d'explication chargées.")
    else:
        print(
            "  [ATTENTION] « metadata_chargees » vaut 0 : relancez ce script, "
            "ou voir la section 10 (dépannage) du README.md."
        )


# --------------------------------------------------------------------------
# Étape 6 : frontend
# --------------------------------------------------------------------------

def afficher_resume_final():
    titre("Étape 6/6 : démarrage du frontend")
    print(
        f"""
Dans un instant, le frontend sera disponible sur :
    {URL_FRONTEND}

Documentation interactive de l'API :
    {URL_DOC_API}

Comptes de test :
    admin             / {MOT_DE_PASSE_ADMIN}   (créé automatiquement)
    agent.test        / {MOT_DE_PASSE_ADMIN}   (à créer une seule fois, à la main,
    superviseur.test  / {MOT_DE_PASSE_ADMIN}    dans Administration > Utilisateurs > Nouveau compte — README, section 7.2)

Le frontend va maintenant occuper ce terminal (comme « npm run start » dans
le README). Pour l'arrêter : Ctrl+C. Le backend Docker, lui, continuera de
tourner : pour l'arrêter aussi, exécutez « docker compose down » dans le
dossier scoring-backend/.
"""
    )


def ouvrir_navigateur_plus_tard(delai_secondes=4):
    def ouvrir():
        try:
            webbrowser.open(URL_FRONTEND)
        except Exception:
            pass  # tant pis : pas grave si aucun navigateur ne peut s'ouvrir ici

    minuteur = threading.Timer(delai_secondes, ouvrir)
    minuteur.daemon = True
    minuteur.start()


def arreter_de_force(processus):
    """Arrête tout l'arbre de processus du frontend (npm, et le serveur
    Next.js qu'il lance en dessous), pas seulement npm lui-même : sinon,
    aussi bien sous Windows que sous Ubuntu/macOS, le serveur Next.js peut
    survivre tout seul, orphelin, et garder le port occupé. C'est pour ça
    que le frontend est lancé dans son propre groupe de processus (plus
    bas) : on peut ici cibler ce groupe entier d'un coup."""
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(processus.pid)],
            capture_output=True,
        )
    else:
        try:
            os.killpg(os.getpgid(processus.pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        processus.wait(timeout=5)
    except subprocess.TimeoutExpired:
        pass


def arreter_en_douceur(processus, timeout=TIMEOUT_ARRET_FRONTEND_SECONDES):
    """Demande poliment l'arrêt du frontend (l'équivalent d'un Ctrl+C envoyé
    directement à npm et à Next.js), puis attend qu'il se termine tout
    seul. Renvoie True s'il s'est arrêté à temps."""
    if os.name == "nt":
        try:
            processus.send_signal(signal.CTRL_BREAK_EVENT)
        except (ValueError, OSError):
            pass
    else:
        try:
            os.killpg(os.getpgid(processus.pid), signal.SIGINT)
        except ProcessLookupError:
            pass
    try:
        processus.wait(timeout=timeout)
        return True
    except subprocess.TimeoutExpired:
        return False


def port_deja_utilise(port, hote="localhost"):
    """Vérifie si un programme écoute déjà sur ce port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((hote, port)) == 0


def lancer_frontend():
    preparer_env_frontend()
    executer(["npm", "ci"], cwd=DOSSIER_FRONTEND)
    executer(["npm", "run", "build"], cwd=DOSSIER_FRONTEND)

    if port_deja_utilise(PORT_FRONTEND):
        sys.exit(
            f"\n[ERREUR] Le port {PORT_FRONTEND} est déjà utilisé par un autre programme : "
            "le frontend ne peut pas démarrer dessus.\n\n"
            "Solutions :\n"
            f"  - Fermez le programme qui utilise déjà ce port (par exemple un autre "
            "« npm run dev » ou « npm run start » resté ouvert dans un autre terminal), "
            "puis relancez ce script.\n"
            f"  - Pour trouver quel programme utilise le port {PORT_FRONTEND} :\n"
            f"      Linux / macOS :  ss -ltnp | grep {PORT_FRONTEND}\n"
            f"      Windows        :  netstat -ano | findstr {PORT_FRONTEND}\n"
            "Voir aussi la section 10 (dépannage) du README.md."
        )

    afficher_resume_final()

    npm = shutil.which("npm")
    if npm is None:
        sys.exit("[ERREUR] Commande introuvable : « npm ». Voir la section 3 du README.md.")

    ouvrir_navigateur_plus_tard()

    # Le frontend démarre dans son propre groupe de processus : ainsi, à
    # l'arrêt, on peut cibler tout ce qu'il a lancé (npm, et Next.js en
    # dessous) en une seule fois, sans rien laisser tourner en orphelin.
    options_groupe = {}
    if os.name == "nt":
        options_groupe["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        options_groupe["start_new_session"] = True

    print("$ npm run start", flush=True)
    processus = subprocess.Popen(
        [npm, "run", "start"], cwd=DOSSIER_FRONTEND, shell=False, **options_groupe
    )
    try:
        processus.wait()
    except KeyboardInterrupt:
        print("\n\n=== Arrêt du frontend demandé (Ctrl+C) ===")
        print("On l'arrête proprement...")
        if arreter_en_douceur(processus):
            print("  [OK] Frontend arrêté.")
        else:
            print("  [INFO] Ça prend trop de temps : arrêt forcé.")
            arreter_de_force(processus)
        print(
            f"\nLe backend Docker continue de tourner en arrière-plan.\n"
            f"Pour l'arrêter : cd {DOSSIER_BACKEND.name} puis docker compose down\n"
        )


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------

def main():
    if sys.version_info < (3, 8):
        sys.exit("[ERREUR] Python 3.8 ou plus récent est nécessaire.")

    verifier_prerequis()
    preparer_env_backend()

    titre("Étape 3/6 : démarrage des conteneurs Docker")
    print("(le tout premier lancement peut prendre plusieurs dizaines de minutes : téléchargements et installation)")
    executer(["docker", "compose", "up", "-d", "--build"], cwd=DOSSIER_BACKEND)

    titre("Étape 4/6 : attente que l'API soit prête")
    attendre_api_prete()

    initialiser_donnees_demo()
    lancer_frontend()


if __name__ == "__main__":
    try:
        # Évite les problèmes d'accents dans une vieille console Windows.
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        # Filet de sécurité : si ce script est lancé d'une façon qui ferait
        # hériter un Ctrl+C « ignoré » (par exemple depuis un autre script,
        # en arrière-plan), on rétablit le comportement normal, pour que
        # Ctrl+C fonctionne toujours ici.
        signal.signal(signal.SIGINT, signal.default_int_handler)
    except (ValueError, OSError):
        pass
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n\n[INFO] Interrompu par l'utilisateur (Ctrl+C).")
