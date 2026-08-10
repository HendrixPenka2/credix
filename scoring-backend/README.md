# Scoring Backend — Application IA de Prédiction du Comportement de Solvabilité

**ENSPY GI2026 / IT Nearshore**
**Étudiant :** Singhe Penka Hendrix Donavan — 21P05A
**Encadreur professionnel :** IT Nearshore
**Stack :** FastAPI · Python 3.12 · LightGBM · SHAP · WOE · MongoDB · WeasyPrint · Docker

---

## Table des matières

1. [Ce qu'on a construit](#1-ce-quon-a-construit)
2. [Architecture globale](#2-architecture-globale)
3. [Collections MongoDB — schéma complet](#3-collections-mongodb--schéma-complet)
4. [Pipeline ML — comment ça marche](#4-pipeline-ml--comment-ça-marche)
5. [Architecture data-driven](#5-architecture-data-driven)
6. [Prérequis](#6-prérequis)
7. [Installation pas à pas](#7-installation-pas-à-pas)
8. [Scripts de setup dans l'ordre](#8-scripts-de-setup-dans-lordre)
9. [Lancer le backend](#9-lancer-le-backend)
10. [Tester chaque route](#10-tester-chaque-route)
11. [Mode mock sans artefacts](#11-mode-mock-sans-artefacts)
12. [Enrichir feature_stats.json dans le notebook](#12-enrichir-feature_statsjson-dans-le-notebook)
13. [Décisions d'architecture](#13-décisions-darchitecture)
14. [Structure complète du code](#14-structure-complète-du-code)
15. [Commandes utiles](#15-commandes-utiles)
16. [Endpoints complets](#16-endpoints-complets)

---

## 1. Ce qu'on a construit

Ce backend implémente un système complet de scoring de risque de crédit pour personnes physiques.

**Ce que fait le système :**
- Un agent de crédit saisit les informations d'un client dans une interface React
- Le backend calcule un Score PDO (300–850) et une probabilité de défaut
- Le système décide automatiquement ACCORDÉ / REFUSÉ / REVUE MANUELLE
- Les décisions en REVUE sont soumises à un superviseur qui peut valider ou rejeter
- Un rapport PDF complet est généré pour chaque décision
- Un administrateur peut configurer les seuils et gérer les utilisateurs

**Concepts clés implémentés :**

| Concept | Ce que c'est | Où dans le code |
|---------|-------------|-----------------|
| WOE | Weight of Evidence — transforme les variables en valeurs de risque | `woe_transformers.pkl` + `pipeline_service.py` |
| NAP | Sélection des features les plus informatives | `nap_features.pkl` |
| ρc (rho_c) | Indice de couverture — richesse du dossier client | `rho_service.py` |
| SHAP | Explication de la décision par variable | `shap_service.py` |
| Score PDO | Score bancaire interprétable (comme FICO/CRIF) | `pdo_service.py` |
| Thin-file | Client sans historique — géré via ρc | `rho_service.py` + `pipeline_service.py` |
| PSI | Population Stability Index — dérive du modèle | `psi_service.py` |
| Data-driven | Formulaire React construit depuis MongoDB | `feature_metadata` + `GET /api/scoring/form-schema` |

**Les 3 rôles utilisateur :**

| Rôle | Ce qu'il peut faire |
|------|-------------------|
| AGENT | Chercher un client, créer un client, lancer un scoring, simuler, voir l'historique, télécharger PDF |
| SUPERVISEUR | Tout AGENT + file de revue manuelle, valider/rejeter une décision, dashboard, monitoring PSI |
| ADMIN | Tout SUPERVISEUR + gérer les utilisateurs, configurer les seuils PDO, promouvoir un modèle |

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│  React (Frontend) — port 3000                           │
│  Écrans E01→E07 (Login, Formulaire, Résultat, Revue...) │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI — port 8080                                    │
│  • 23 endpoints REST                                    │
│  • Middleware JWT (vérification à chaque requête)       │
│  • Pipeline ML chargé en RAM au démarrage               │
│  • Orchestration de tous les services                   │
└──────┬────────────────┬────────────────┬────────────────┘
       │                │                │
       ▼                ▼                ▼
MongoDB :27017    MLflow :5000    PDF-Worker :8001
7 collections     Tracking        WeasyPrint
(données)         (modèles)       (rapports PDF)

Pipeline ML (en RAM — jamais rechargé sauf promotion modèle) :
  woe_transformers.pkl   → transformations WOE gelées
  nap_features.pkl       → liste des N features retenues
  lgbm_final.pkl         → modèle LightGBM entraîné
  iv_scores_final.csv    → Information Value par feature (pour ρc)
  feature_stats.json     → statistiques (pour generate_metadata.py)
```

**Les 4 conteneurs Docker :**

```
scoring-api      :8080  — FastAPI + Pipeline ML (principal)
scoring-mongodb  :27017 — Base de données MongoDB 7.0
scoring-mlflow   :5000  — Tracking des versions de modèles
scoring-pdf      :8001  — Service WeasyPrint (génération PDF)
```

---

## 3. Collections MongoDB — schéma complet

### `clients` — profils des personnes à scorer
```json
{
  "client_id": "HC-100001",
  "created_at": "2026-05-30T...",
  "profile": {
    "nom": "Mballa", "prenom": "Thierry",
    "date_naissance": "1985-04-12",
    "genre": "M",
    "situation_familiale": "Married",
    "type_emploi": "Laborers",
    "type_revenu": "Working",
    "niveau_education": "Secondary / secondary special"
  },
  "coverage": {
    "rho": 0.72,
    "sources_disponibles": ["EXT_SOURCE_2", "loan_to_income_ratio", "..."],
    "sources_manquantes": ["bureau_nb_credits"],
    "has_history": true
  },
  "features": {
    "age_years": 41.1,
    "employment_years": 5.3,
    "EXT_SOURCE_2": 0.613,
    "loan_to_income_ratio": null,
    "pos_taux_retard_3m": 0.0
  },
  "last_score": {"score_pdo": 623, "decision": "ACCORDE", "pd_c": 0.041, "date": "..."},
  "is_new_client": false
}
```

### `feature_metadata` — cœur du système data-driven
```json
{
  "run_id": "lgbm-run-v1",
  "feature": "loan_to_income_ratio",
  "libelle_agent": "Ratio crédit / revenu annuel",
  "famille": "F8",
  "iv": 0.312,
  "is_declarative": true,
  "champs_source": [
    {"nom": "montant_credit_demande", "label": "Montant du crédit (FCFA)", "type": "number", "obligatoire": true},
    {"nom": "revenu_annuel", "label": "Revenu annuel déclaré (FCFA)", "type": "number", "obligatoire": true}
  ],
  "formule": "montant_credit_demande / revenu_annuel",
  "seuils": [
    {"max": 0.87, "label": "faible — crédit bien proportionné"},
    {"max": 1.34, "label": "modéré"},
    {"max": 2.10, "label": "élevé"},
    {"max": 3.80, "label": "très élevé"},
    {"max": 999,  "label": "extrême"}
  ],
  "gabarit_aggravant": "Le ratio crédit/revenu est {label} ({valeur:.2f}), ce qui augmente le risque.",
  "gabarit_attenuant": "Le ratio crédit/revenu est {label} ({valeur:.2f}), indiquant une bonne capacité.",
  "document_recommande": "Justificatif de revenu des 3 derniers mois"
}
```

### `decisions` — résultats de scoring
```json
{
  "demande_id": "uuid",
  "client_id": "HC-100001",
  "timestamp": "2026-05-30T...",
  "pd_c": 0.0412,
  "score_pdo": 623,
  "decision_initiale": {"valeur": "ACCORDE"},
  "decision_finale": {"valeur": "ACCORDE"},
  "rho_c": 0.724,
  "shap_top5": [
    {"feature": "EXT_SOURCE_2", "libelle_agent": "Score bureau de crédit",
     "shap_value": -0.54, "direction": "attenuant",
     "explication_naturelle": "Le score bureau est favorable (0.61)..."}
  ],
  "recommandation_rho": {"afficher": false},
  "percentile": {"percentile": 72, "message": "Ce client est supérieur à 72% des dossiers récents."},
  "override_superviseur": false,
  "model_version": "lgbm-run-v1"
}
```

### `demandes` — historique complet des appels de scoring
### `utilisateurs` — comptes AGENT / SUPERVISEUR / ADMIN avec statistiques
### `modeles` — versions PRODUCTION / STAGING / ARCHIVE avec métriques AUC/Gini/KS
### `audit_logs` — traçabilité immuable (toute action écrit un log)
### `admin_config` — seuils PDO configurables + modèle actif

---

## 4. Pipeline ML — comment ça marche

Le pipeline s'exécute à chaque appel `POST /api/scoring/predict`.
Les artefacts sont **en RAM** — aucun rechargement à chaque requête.

```
Entrée : client_id + valeurs saisies par l'agent
         ↓
① Assembler le vecteur de features
   - Features is_declarative=true  → calculées depuis les valeurs saisies (formule)
   - Features is_declarative=false → lues depuis MongoDB clients (profil historique)
         ↓
② Calculer ρc AVANT WOE (sur les vrais NaN)
   ρc = Σ(IV des features disponibles) / Σ(IV total)
   → ρc < 0.25 : revue manuelle FORCÉE indépendamment du score
   → ρc < 0.40 : bannière de recommandation documentaire affichée
         ↓
③ Appliquer WOE gelé
   - Les NaN → bin "Manquant" (valeur WOE calculée à l'entraînement)
   - Pas d'imputation arbitraire — le modèle a appris le risque du "Manquant"
         ↓
④ Sélectionner les N features NAP
   DataFrame de dimension [1, N] prêt pour LightGBM
         ↓
⑤ Prédiction LightGBM
   predict_proba(X)[0][1] → PD_c (probabilité de défaut, entre 0 et 1)
         ↓
⑥ TreeSHAP — Top 5 features
   shap.TreeExplainer(model).shap_values(X)
   → Top 5 triés par |valeur SHAP| décroissante
   → Substitution dans les gabarits feature_metadata → phrases en français
         ↓
⑦ Score PDO
   Score = 515.06 - 28.85 × ln(PD_c / (1 - PD_c))
   Ancrage : PD=5% → Score=600, PDO=20
         ↓
⑧ Règle de décision
   Si ρc < 0.25            → REVUE_MANUELLE (thin-file)
   Si Score ≥ 600          → ACCORDÉ
   Si Score < 500          → REFUSÉ
   Si 500 ≤ Score < 600    → REVUE_MANUELLE
   (Seuils configurables par l'admin dans MongoDB)
         ↓
⑨ Recommandation documentaire si ρc < 0.40
   Liste les features manquantes triées par IV décroissant
   → Documents à demander au client pour enrichir le dossier
         ↓
⑩ Calcul percentile (F2)
   Position du score dans la distribution mensuelle des décisions
         ↓
⑪ Sauvegarde MongoDB
   demandes + decisions + audit_logs + update clients.last_score
         ↓
Sortie : JSON complet → React → Écran E03
```

---

## 5. Architecture data-driven

**Le problème qu'on résout :** le formulaire de saisie de l'agent doit s'adapter à chaque banque (labels différents, champs différents, formules différentes) sans modifier le code React.

**La solution :** `GET /api/scoring/form-schema` retourne la définition complète du formulaire depuis MongoDB. React construit le formulaire dynamiquement depuis cette réponse.

```
generate_metadata.py (tourne 1x après entrainement)
    ↓
Lit feature_stats.json (enrichi avec is_declarative + formule)
    ↓
Appelle LLM Gemini pour les libellés + gabarits SHAP
    ↓
feature_metadata stocké dans MongoDB
    ↓
FastAPI charge feature_metadata en RAM au démarrage
    ↓
GET /api/scoring/form-schema → extrait les champs déclaratifs dédupliqués
    ↓
React construit le formulaire depuis la réponse API (zéro hardcode)
```

**Pour changer de banque :**
1. Faire le feature engineering sur les données de la banque
2. Mettre à jour `feature_stats.json` avec les bonnes `formule` et `champs_source`
3. Relancer `generate_metadata.py`
4. Le frontend React s'adapte automatiquement

---

## 6. Prérequis

- **Docker Desktop** installé et démarré (version 24+)
- **Python 3.12+** installé localement (pour les scripts de setup uniquement)
- **Tes 5 artefacts ML** produits par le notebook Kaggle (voir section 12 pour `feature_stats.json`)
- **Tes CSV Home Credit** : `application_test.csv`, `bureau.csv`, `installments_payments.csv`, `POS_CASH_balance.csv`, `credit_card_balance.csv`, `previous_application.csv`
- **Une clé API Gemini** (gratuite sur https://aistudio.google.com)

---

## 7. Installation pas à pas

### Étape A — Configurer l'environnement

```bash
# 1. Copier le fichier de config
cp .env.example .env
```

Ouvre `.env` dans un éditeur et remplis **exactement ces 3 lignes** :

```env
# ⚠️ LIGNE 1 — Chemin de tes CSV Home Credit
# Windows exemple : HOME_CREDIT_DATA_DIR=C:/Users/Penka/Documents/home_credit_data
# Linux exemple   : HOME_CREDIT_DATA_DIR=/home/penka/data/home_credit
HOME_CREDIT_DATA_DIR=METTRE_LE_CHEMIN_ICI

# ⚠️ LIGNE 2 — Ta clé API Gemini (va sur https://aistudio.google.com pour en avoir une)
GOOGLE_API_KEY=METTRE_TA_CLE_GEMINI_ICI

# ⚠️ LIGNE 3 — Secret JWT fort (copie-colle la sortie de la commande ci-dessous)
# Commande pour générer : python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=METTRE_UN_SECRET_FORT_ICI
```

Tout le reste dans `.env` peut rester tel quel pour le développement local.

### Étape B — Copier tes artefacts

Copie tes 5 fichiers dans le dossier `artefacts/` :

```bash
# Windows PowerShell
Copy-Item "C:\ton\chemin\lgbm_final.pkl"      "artefacts\lgbm_final.pkl"
Copy-Item "C:\ton\chemin\woe_transformers.pkl" "artefacts\woe_transformers.pkl"
Copy-Item "C:\ton\chemin\nap_features.pkl"     "artefacts\nap_features.pkl"
Copy-Item "C:\ton\chemin\iv_scores_final.csv"  "artefacts\iv_scores_final.csv"
Copy-Item "C:\ton\chemin\feature_stats.json"   "artefacts\feature_stats.json"

# Linux / Mac
cp /ton/chemin/{lgbm_final.pkl,woe_transformers.pkl,nap_features.pkl} artefacts/
cp /ton/chemin/{iv_scores_final.csv,feature_stats.json} artefacts/
```

**Important :** ton `feature_stats.json` doit être enrichi avec les champs `is_declarative`, `champs_source` et `formule`. Voir section 12.

### Étape C — Créer l'environnement Python et installer les dépendances

Les 4 scripts de setup (`create_admin.py`, `generate_metadata.py`, `register_model.py`, `seed_database.py`) tournent **en local** et se connectent à MongoDB via le port exposé par Docker. Ils ont donc besoin d'un environnement Python local — mais isolé pour ne pas polluer ton Python global.

> **Pourquoi pas dans Docker ?** Ces scripts ne tournent qu'une seule fois au setup. Les sortir du conteneur évite de complexifier le `docker-compose.yml` pour des opérations ponctuelles.

**Créer l'environnement conda dédié (recommandé si tu as Anaconda/Miniconda) :**

```bash
# Créer l'environnement avec Python 3.12
conda create -n scoring-backend python=3.12 -y

# Activer l'environnement
conda activate scoring-backend

# Installer les dépendances
pip install -r requirements.txt
```

**Alternative — virtualenv (si tu n'as pas conda) :**

```bash
python -m venv venv
source venv/bin/activate      # Linux / Mac
# venv\Scripts\activate       # Windows PowerShell

pip install -r requirements.txt
```

**Activer / désactiver selon l'environnement choisi :**

| Action | Conda | venv |
|--------|-------|------|
| Activer | `conda activate scoring-backend` | `source venv/bin/activate` |
| Désactiver | `conda deactivate` | `deactivate` |
| Vérifier que c'est actif | `(scoring-backend)` dans le prompt | `(venv)` dans le prompt |

> **Important :** active toujours cet environnement avant de lancer les scripts de la section 8.

---

## 8. Scripts de setup dans l'ordre

Lance ces 4 scripts **une seule fois**, dans cet ordre, **après avoir démarré Docker** (voir section 9).

### Script 1 — Créer le compte ADMIN

```bash
python scripts/create_admin.py --username admin --password Admin2026!
```

Tu peux changer le username et le password. **Note-les bien.**

Sortie attendue :
```
[OK] Admin créé: username='admin' / role=ADMIN
     user_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Script 2 — Générer les métadonnées SHAP (nécessite clé Gemini)

Ce script lit `feature_stats.json` et appelle Gemini Flash pour chaque feature afin de générer les libellés lisibles et les gabarits de phrases SHAP. Il prend entre 5 et 15 minutes (27 appels API).

```bash
python scripts/generate_metadata.py --run-id lgbm-run-v1
```

Pour tester d'abord sans appeler le LLM (dry run) :
```bash
python scripts/generate_metadata.py --run-id lgbm-run-v1 --dry-run
```

Le dry run valide que ton `feature_stats.json` est bien formé mais n'écrit rien dans MongoDB.

Sortie attendue :
```
[generate_metadata] 27 features à traiter (provider: gemini)
  Traitement: loan_to_income_ratio... OK
  Traitement: EXT_SOURCE_2... OK
  ...
[OK] 27 features générées, 0 fallbacks
[OK] feature_metadata inséré dans MongoDB (run_id=lgbm-run-v1)
```

Si une feature échoue 3 fois, un gabarit de fallback est utilisé. C'est normal pour les features atypiques.

### Script 3 — Enregistrer le modèle en PRODUCTION

```bash
python scripts/register_model.py \
  --run-id lgbm-run-v1 \
  --version 1.0.0 \
  --promote \
  --auc 0.762 \
  --gini 0.524 \
  --ks 0.41
```

Remplace `0.762`, `0.524`, `0.41` par tes vraies métriques issues du notebook.
Le flag `--promote` passe directement le modèle en PRODUCTION (pas besoin de passer par STAGING pour la première fois).

Sans `--promote` : le modèle est enregistré en STAGING et peut être promu plus tard via l'interface.

Sortie attendue :
```
[OK] Modèle enregistré: run_id=lgbm-run-v1 version=1.0.0 statut=PRODUCTION
```

### Script 4 — Peupler la base clients (ETL Home Credit)

Ce script lit tes CSV Home Credit, calcule toutes les features pour chaque client, attribue un nom fictif camerounais/tunisien déterministe, et insère tout dans MongoDB.

Pour tester avec 500 clients d'abord (recommandé) :
```bash
python scripts/seed_database.py --limit 500
```

Pour insérer les 48 744 clients complets (environ 5 minutes) :
```bash
python scripts/seed_database.py
```

Pour tout effacer et recommencer :
```bash
python scripts/seed_database.py --reset
```

Sortie attendue :
```
[HomeCreditAdapter] Chargement des CSV...
  application_test.csv : 48744 lignes
[SEED] 500 clients à insérer...
  500/500 insérés...
[SEED] Terminé: 500 clients insérés, 0 erreurs
```

---

## 9. Lancer le backend

### Démarrer tous les conteneurs

```bash
docker-compose up --build -d
```

La première fois, Docker télécharge les images et construit les conteneurs. Ça peut prendre 5 à 10 minutes.

### Vérifier que tout est démarré

```bash
docker-compose ps
```

Tu dois voir 4 lignes avec `Up` :
```
NAME                 STATUS
scoring-api          Up (healthy)
scoring-mongodb      Up (healthy)
scoring-mlflow       Up
scoring-pdf          Up (healthy)
```

Si un conteneur est `Exit` ou `Restarting`, consulte ses logs :
```bash
docker-compose logs api
docker-compose logs mongodb
```

### Vérifier la santé du backend

```bash
curl http://localhost:8080/health
```

R�ponse attendue après setup complet :
```json
{
  "statut": "ok",
  "features_chargees": 27,
  "metadata_chargees": 27,
  "mock_mode": false
}
```

Si `metadata_chargees: 0`, le script `generate_metadata.py` n'a pas encore tourné ou le modèle n'est pas en PRODUCTION. Lance d'abord les scripts de setup (section 8) puis redémarre l'API :
```bash
docker-compose restart api
```

### Accéder à Swagger UI

Ouvre dans ton navigateur : **http://localhost:8080/docs**

Tu vois toutes les routes documentées avec la possibilité de les tester directement.

Pour s'authentifier dans Swagger :
1. Appelle `POST /api/auth/login` avec ton username/password
2. Copie le `token` de la réponse
3. Clique sur **Authorize** (en haut à droite de Swagger)
4. Colle le token et confirme

---

## 10. Tester chaque route

Toutes les routes peuvent être testées via Swagger (http://localhost:8080/docs) ou via `curl`. Les exemples ci-dessous utilisent `curl`.

### 10.1 Authentification

**Login (obtenir un token) :**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin2026!"}'
```

R�ponse :
```json
{
  "token": "eyJhbGci...",
  "role": "ADMIN",
  "user_id": "...",
  "nom": "Administrateur",
  "prenom": "Systeme",
  "expires_at": "2026-05-30T17:00:00"
}
```

Stocke le token dans une variable pour les tests suivants :
```bash
# Linux / Mac
TOKEN="eyJhbGci..."

# Windows PowerShell
$TOKEN = "eyJhbGci..."
```

**Logout :**
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### 10.2 Gestion des utilisateurs (ADMIN)

**Créer un agent :**
```bash
curl -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent.fotso",
    "password": "Agent2026!",
    "role": "AGENT",
    "nom": "Fotso",
    "prenom": "Thierry",
    "email": "thierry.fotso@banque.cm",
    "agence": "Yaoundé Centre"
  }'
```

**Créer un superviseur :**
```bash
curl -X POST http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superviseur.mballa",
    "password": "Sup2026!",
    "role": "SUPERVISEUR",
    "nom": "Mballa",
    "prenom": "Serge",
    "email": "serge.mballa@banque.cm"
  }'
```

**Lister les utilisateurs :**
```bash
curl http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

**Désactiver un compte :**
```bash
curl -X PUT "http://localhost:8080/api/admin/users/USER_ID/toggle" \
  -H "Authorization: Bearer $TOKEN"
```

### 10.3 Schéma du formulaire (data-driven)

```bash
curl http://localhost:8080/api/scoring/form-schema \
  -H "Authorization: Bearer $TOKEN"
```

R�ponse attendue :
```json
{
  "champs": [
    {"nom": "montant_credit_demande", "label": "Montant du crédit demandé (FCFA)", "type": "number", "obligatoire": true},
    {"nom": "revenu_annuel",          "label": "Revenu annuel déclaré (FCFA)",    "type": "number", "obligatoire": true},
    {"nom": "montant_annuite",        "label": "Annuité mensuelle (FCFA)",        "type": "number", "obligatoire": true},
    {"nom": "valeur_bien",            "label": "Valeur du bien financé (FCFA)",   "type": "number", "obligatoire": false},
    {"nom": "type_contrat",           "label": "Type de contrat",                 "type": "select", "options": ["Cash loans", "Revolving loans"]}
  ],
  "run_id": "lgbm-run-v1",
  "nb_features_modele": 27
}
```

C'est ce que React utilise pour construire le formulaire E02.

### 10.4 Recherche de clients

```bash
curl "http://localhost:8080/api/clients/search?q=Mballa" \
  -H "Authorization: Bearer $TOKEN"
```

```bash
curl "http://localhost:8080/api/clients/search?q=HC-100" \
  -H "Authorization: Bearer $TOKEN"
```

### 10.5 Récupérer un client par ID

```bash
curl http://localhost:8080/api/clients/HC-100001 \
  -H "Authorization: Bearer $TOKEN"
```

### 10.6 Créer un nouveau client (flux nouveau client)

```bash
curl -X POST http://localhost:8080/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Ben Salem",
    "prenom": "Mehdi",
    "date_naissance": "1990-03-15",
    "genre": "M",
    "situation_familiale": "Married",
    "type_emploi": "Laborers",
    "type_revenu": "Working",
    "niveau_education": "Higher education",
    "anciennete_emploi_mois": 36,
    "revenu_annuel": 150000,
    "telephone": "+237612345678"
  }'
```

R�ponse :
```json
{
  "client_id": "CLT-20260530-A3F2B1C4",
  "message": "Client créé avec succès",
  "is_new_client": true,
  "has_history": false
}
```

**Note sur ce client :** il sera thin-file. ρc sera très bas (~0.20) car toutes ses features historiques sont NULL. Le système forcera REVUE_MANUELLE et affichera la bannière des documents à demander.

### 10.7 Scorer un client existant (avec historique)

```bash
curl -X POST http://localhost:8080/api/scoring/predict \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "HC-100001",
    "declaratif": {
      "montant_credit_demande": 250000,
      "revenu_annuel": 180000,
      "montant_annuite": 12000,
      "valeur_bien": 300000,
      "type_contrat": "Cash loans"
    }
  }'
```

R�ponse complète :
```json
{
  "demande_id": "uuid-de-la-demande",
  "client_id": "HC-100001",
  "pd_c": 0.0412,
  "score_pdo": 623,
  "decision": "ACCORDE",
  "rho_c": 0.724,
  "shap_top5": [
    {
      "feature": "EXT_SOURCE_2",
      "libelle_agent": "Score du bureau de crédit externe",
      "shap_value": -0.54,
      "direction": "attenuant",
      "explication_naturelle": "Le score du bureau de crédit est favorable (0.61), ce qui réduit le risque estimé."
    }
  ],
  "recommandation_rho": {"afficher": false},
  "percentile": {
    "percentile": 72,
    "message": "Ce client est supérieur à 72% des dossiers examinés ce mois."
  },
  "model_version": "lgbm-run-v1",
  "timestamp": "2026-05-30T..."
}
```

### 10.8 Scorer un nouveau client (thin-file)

```bash
curl -X POST http://localhost:8080/api/scoring/predict \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "CLT-20260530-A3F2B1C4",
    "declaratif": {
      "montant_credit_demande": 120000,
      "revenu_annuel": 150000,
      "montant_annuite": 8000,
      "valeur_bien": 150000,
      "type_contrat": "Cash loans"
    }
  }'
```

R�ponse attendue (thin-file) :
```json
{
  "score_pdo": 541,
  "decision": "REVUE_MANUELLE",
  "rho_c": 0.19,
  "recommandation_rho": {
    "afficher": true,
    "niveau_urgence": "CRITIQUE",
    "message": "Dossier insuffisant — revue manuelle obligatoire",
    "documents_recommandes": [
      {"libelle": "Score bureau de crédit", "document": "Rapport bureau de crédit externe", "gain_rho_estime": "+18.2%"},
      {"libelle": "Historique POS Cash",    "document": "Relevé bancaire des 3 derniers mois", "gain_rho_estime": "+8.4%"}
    ]
  }
}
```

### 10.9 Simulation what-if

Tester un scénario hypothétique sans sauvegarder dans MongoDB :

```bash
curl -X POST http://localhost:8080/api/scoring/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "HC-100001",
    "declaratif": {
      "montant_credit_demande": 450000,
      "revenu_annuel": 180000,
      "montant_annuite": 22000,
      "valeur_bien": 500000,
      "type_contrat": "Cash loans"
    }
  }'
```

La réponse est la même qu'un scoring réel mais avec `"is_simulation": true` et rien n'est écrit dans MongoDB.

### 10.10 Historique des scores d'un client (F4)

```bash
curl http://localhost:8080/api/scoring/history/HC-100001 \
  -H "Authorization: Bearer $TOKEN"
```

R�ponse :
```json
{
  "client_id": "HC-100001",
  "historique": [
    {"demande_id": "...", "timestamp": "2026-05-28...", "score_pdo": 598, "decision": "REVUE_MANUELLE", "rho_c": 0.71},
    {"demande_id": "...", "timestamp": "2026-05-30...", "score_pdo": 623, "decision": "ACCORDE", "rho_c": 0.724}
  ],
  "total": 2
}
```

Le frontend affiche ça en graphique temporel sur l'écran E05 (Profil Client).

### 10.11 File de revue manuelle (SUPERVISEUR)

```bash
curl http://localhost:8080/api/decisions/pending-review \
  -H "Authorization: Bearer $TOKEN_SUPERVISEUR"
```

Retourne tous les dossiers où `decision = REVUE_MANUELLE` et `override_superviseur = false`.

### 10.12 Valider une revue manuelle (SUPERVISEUR)

```bash
curl -X POST "http://localhost:8080/api/decisions/UUID_DEMANDE/override" \
  -H "Authorization: Bearer $TOKEN_SUPERVISEUR" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "ACCORDE",
    "commentaire": "Dossier examiné en détail. Client fiable selon les documents fournis en agence. Accord accordé."
  }'
```

Le commentaire doit faire minimum 20 caractères (obligation métier).

Pour rejeter :
```bash
  -d '{"decision": "REFUSE", "commentaire": "Ratio crédit/revenu trop élevé après vérification des revenus réels."}'
```

### 10.13 Télécharger le rapport PDF

```bash
curl -o rapport_scoring.pdf \
  "http://localhost:8080/api/decisions/UUID_DEMANDE/pdf" \
  -H "Authorization: Bearer $TOKEN"
```

Le PDF généré contient 6 sections :
- En-tête avec identification du dossier
- Décision avec badge coloré (vert/rouge/orange)
- Score PDO avec jauge graphique SVG + cercle ρc SVG
- Comparaison au profil moyen du mois
- Bannière documentaire si ρc < 0.40
- Top 5 SHAP avec barres colorées + phrases en français
- Pied de page avec traçabilité (run_id, demande_id, agent, date)

### 10.14 Dashboard statistiques (SUPERVISEUR)

```bash
# Statistiques sur 30 jours
curl "http://localhost:8080/api/dashboard/statistics?periode=30j" \
  -H "Authorization: Bearer $TOKEN"

# Distribution des scores
curl "http://localhost:8080/api/dashboard/score-distribution?periode=30j" \
  -H "Authorization: Bearer $TOKEN"

# Percentile d'un client spécifique
curl "http://localhost:8080/api/dashboard/client-percentile/HC-100001/UUID_DEMANDE" \
  -H "Authorization: Bearer $TOKEN"
```

### 10.15 Monitoring dérive du modèle (PSI) (SUPERVISEUR)

```bash
curl http://localhost:8080/api/monitoring/model-drift \
  -H "Authorization: Bearer $TOKEN"
```

R�ponse :
```json
{
  "psi": 0.047,
  "statut": "STABLE",
  "couleur": "vert",
  "message": "Distribution stable — aucune action requise",
  "nb_scores_reference": 312,
  "nb_scores_actuels": 89
}
```

Si `statut = DERIVE` (PSI > 0.25), il faut réentraîner le modèle.

### 10.16 Versions des modèles

```bash
curl http://localhost:8080/api/monitoring/model-versions \
  -H "Authorization: Bearer $TOKEN"
```

### 10.17 Promouvoir un modèle STAGING → PRODUCTION (ADMIN)

```bash
curl -X POST http://localhost:8080/api/monitoring/promote-model \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"run_id": "lgbm-run-v2"}'
```

Ce endpoint :
1. Archive l'ancien modèle PRODUCTION
2. Passe le nouveau en PRODUCTION
3. Recharge les artefacts en RAM à chaud (sans redémarrer le serveur)

### 10.18 Configurer les seuils PDO (ADMIN)

```bash
curl -X PUT http://localhost:8080/api/admin/thresholds \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"accorde": 620, "refuse": 480}'
```

Les nouveaux seuils prennent effet immédiatement pour tous les prochains scorings. L'ancien modèle continue avec les mêmes artefacts — seule la règle de décision change.

---

## 11. Mode Mock sans artefacts

Pour développer le frontend sans avoir besoin des vrais artefacts ML :

**Activer le mode mock :**
```bash
# Dans .env, change :
USE_MOCK_ARTEFACTS=true

# Redémarre l'API
docker-compose restart api
```

En mode mock :
- Le modèle retourne des scores cohérents (entre 480 et 720) basés sur une graine aléatoire
- Toutes les routes fonctionnent exactement de la même façon
- Les sauvegardes MongoDB se font normalement
- Les PDFs se génèrent normalement

**Désactiver pour utiliser les vrais artefacts :**
```bash
USE_MOCK_ARTEFACTS=false
docker-compose restart api
```

---

## 12. Enrichir feature_stats.json dans le notebook

**Pourquoi enrichir ?** Le fichier `feature_stats.json` produit par le notebook contient les statistiques des features (p25, p50, p75, IV...). Pour que le système data-driven fonctionne, il faut aussi indiquer pour chaque feature :
- `is_declarative` : l'agent peut-il saisir cette valeur au guichet ?
- `champs_source` : quels champs bruts saisir ?
- `formule` : comment calculer la feature depuis les champs bruts ?

**Règle de décision :**

Une feature est déclarative si l'agent peut l'obtenir en demandant au client au guichet. Exemples :
- `loan_to_income_ratio` → OUI (calculé depuis montant_credit / revenu_annuel)
- `employment_years` → OUI (le client déclare son ancienneté)
- `EXT_SOURCE_2` → NON (score d'un bureau de crédit externe)
- `pos_taux_retard_3m` → NON (historique POS Cash — nécessite un historique bancaire)

**Code à ajouter à la fin du notebook, juste avant la sauvegarde de feature_stats.json :**

```python
# ─────────────────────────────────────────────────────────────
# ENRICHISSEMENT MANUEL : is_declarative + champs_source + formule
# ─────────────────────────────────────────────────────────────
import json

DECLARATIVES_CONFIG = {
    "loan_to_income_ratio": {
        "is_declarative": True,
        "champs_source": [
            {"nom": "montant_credit_demande", "label": "Montant du crédit demandé (FCFA)", "type": "number", "obligatoire": True, "min": 0},
            {"nom": "revenu_annuel", "label": "Revenu annuel déclaré (FCFA)", "type": "number", "obligatoire": True, "min": 0}
        ],
        "formule": "montant_credit_demande / revenu_annuel"
    },
    "debt_to_income": {
        "is_declarative": True,
        "champs_source": [
            {"nom": "montant_annuite", "label": "Annuité mensuelle (FCFA)", "type": "number", "obligatoire": True, "min": 0},
            {"nom": "revenu_annuel",   "label": "Revenu annuel déclaré (FCFA)", "type": "number", "obligatoire": True, "min": 0}
        ],
        "formule": "montant_annuite / revenu_annuel"
    },
    "annuity_to_credit": {
        "is_declarative": True,
        "champs_source": [
            {"nom": "montant_annuite",        "label": "Annuité mensuelle (FCFA)",         "type": "number", "obligatoire": True, "min": 0},
            {"nom": "montant_credit_demande", "label": "Montant du crédit demandé (FCFA)", "type": "number", "obligatoire": True, "min": 0}
        ],
        "formule": "montant_annuite / montant_credit_demande"
    },
    "goods_to_credit": {
        "is_declarative": True,
        "champs_source": [
            {"nom": "valeur_bien",            "label": "Valeur du bien financé (FCFA)",    "type": "number", "obligatoire": False, "min": 0},
            {"nom": "montant_credit_demande", "label": "Montant du crédit demandé (FCFA)", "type": "number", "obligatoire": True,  "min": 0}
        ],
        "formule": "valeur_bien / montant_credit_demande"
    },
    "age_years": {
        "is_declarative": True,
        "champs_source": [{"nom": "date_naissance", "label": "Date de naissance", "type": "date", "obligatoire": True}],
        "formule": None
    },
    "employment_years": {
        "is_declarative": True,
        "champs_source": [{"nom": "anciennete_emploi_mois", "label": "Ancienneté dans l'emploi (mois)", "type": "number", "obligatoire": False, "min": 0}],
        "formule": "anciennete_emploi_mois / 12"
    },
    "CODE_GENDER_bin": {
        "is_declarative": True,
        "champs_source": [{"nom": "genre", "label": "Genre", "type": "select", "options": ["M", "F"], "obligatoire": True}],
        "formule": None
    },
    "FLAG_OWN_CAR_bin": {
        "is_declarative": True,
        "champs_source": [{"nom": "possede_vehicule", "label": "Possède un véhicule ?", "type": "boolean", "obligatoire": True}],
        "formule": None
    },
    "FLAG_OWN_REALTY_bin": {
        "is_declarative": True,
        "champs_source": [{"nom": "est_proprietaire", "label": "Propriétaire immobilier ?", "type": "boolean", "obligatoire": True}],
        "formule": None
    },
    "NAME_CONTRACT_TYPE": {
        "is_declarative": True,
        "champs_source": [{"nom": "type_contrat", "label": "Type de contrat", "type": "select",
                           "options": ["Cash loans", "Revolving loans"], "obligatoire": True}],
        "formule": None
    },
    "NAME_INCOME_TYPE": {
        "is_declarative": True,
        "champs_source": [{"nom": "type_revenu", "label": "Type de revenu", "type": "select",
                           "options": ["Working", "Commercial associate", "Pensioner", "State servant", "Unemployed"],
                           "obligatoire": True}],
        "formule": None
    },
    "NAME_EDUCATION_TYPE": {
        "is_declarative": True,
        "champs_source": [{"nom": "niveau_education", "label": "Niveau d'éducation", "type": "select",
                           "options": ["Secondary / secondary special", "Higher education", "Incomplete higher", "Lower secondary", "Academic degree"],
                           "obligatoire": True}],
        "formule": None
    },
    "NAME_FAMILY_STATUS": {
        "is_declarative": True,
        "champs_source": [{"nom": "situation_familiale", "label": "Situation familiale", "type": "select",
                           "options": ["Married", "Single / not married", "Civil marriage", "Separated", "Widow"],
                           "obligatoire": True}],
        "formule": None
    },
    "NAME_HOUSING_TYPE": {
        "is_declarative": True,
        "champs_source": [{"nom": "type_logement", "label": "Type de logement", "type": "select",
                           "options": ["House / apartment", "With parents", "Municipal apartment",
                                       "Rented apartment", "Office apartment", "Co-op apartment"],
                           "obligatoire": True}],
        "formule": None
    },
}

# Injecter dans feature_stats
for feature, config in DECLARATIVES_CONFIG.items():
    if feature in feature_stats:
        feature_stats[feature]["is_declarative"] = config["is_declarative"]
        feature_stats[feature]["champs_source"]  = config["champs_source"]
        feature_stats[feature]["formule"]        = config["formule"]

# Toutes les autres features → non déclaratives
for feature in feature_stats:
    if "is_declarative" not in feature_stats[feature]:
        feature_stats[feature]["is_declarative"] = False
        feature_stats[feature]["champs_source"]  = []
        feature_stats[feature]["formule"]        = None

# Sauvegarde du fichier enrichi
with open("artefacts/feature_stats.json", "w", encoding="utf-8") as f:
    json.dump(feature_stats, f, ensure_ascii=False, indent=2)

n_decl = sum(1 for v in feature_stats.values() if v["is_declarative"])
n_hist = sum(1 for v in feature_stats.values() if not v["is_declarative"])
print(f"feature_stats.json enrichi : {n_decl} déclaratives + {n_hist} historiques = {n_decl + n_hist} total")
```

Après exécution de ce code dans le notebook, le fichier `feature_stats.json` est prêt à être copié dans `artefacts/` et utilisé par `generate_metadata.py`.

---

## 13. Décisions d'architecture

**Pourquoi LightGBM et pas XGBoost ?**
Vitesse d'inférence supérieure, gestion native des valeurs manquantes (NaN), performances proches de XGBoost sur Home Credit Default Risk selon les benchmarks publiés. Choix validé dans le notebook.

**Pourquoi WOE avant LightGBM ?**
Le WOE stabilise les variables ordinales et catégorielles en les transformant en valeurs de risque monotones. Il gère les valeurs manquantes via un bin "Manquant" qui a sa propre valeur WOE calculée à l'entraînement — pas d'imputation arbitraire qui créerait un biais.

**Pourquoi ρc calculé AVANT WOE et pas après ?**
ρc mesure la richesse réelle du dossier sur les valeurs brutes. Si calculé après WOE, les NaN ont déjà été remplacés par leur bin "Manquant" et disparaissent — ρc serait toujours 1.0, ce qui rendrait la mesure inutile.

**Pourquoi l'ETL initial et pas calcul temps réel ?**
Lire 7 CSV (plusieurs gigaoctets) à chaque scoring tuerait les performances. L'ETL calcule les features une seule fois pour tous les clients et stocke dans MongoDB. À l'inférence, un `find_one` MongoDB prend < 5ms.

**Pourquoi 4 conteneurs et pas 1 ?**
WeasyPrint nécessite des dépendances système lourdes (libpango, libcairo, libgdk-pixbuf) qui alourdiraient inutilement l'image FastAPI. En séparant, l'image API reste légère et les deux services peuvent scaler indépendamment.

**Pourquoi les seuils PDO dans MongoDB et pas hardcodés ?**
En production réelle, les seuils de décision sont révisés périodiquement selon les politiques crédit et le contexte économique. Les stocker en base permet à l'admin de les ajuster sans redéployer — c'est une exigence métier standard.

**Pourquoi feature_metadata en RAM et pas en base à chaque requête ?**
feature_metadata est lu à chaque scoring (27 lookups pour générer les phrases SHAP). Le charger en mémoire au démarrage réduit la latence de plusieurs centaines de millisecondes. Il est rechargé uniquement lors d'une promotion de modèle.

---

## 14. Structure complète du code

```
scoring-backend/
│
├── .env.example                  Config template — copier en .env
├── .gitignore                    Exclut .env, artefacts/*.pkl, __pycache__
├── docker-compose.yml            4 conteneurs Docker orchestrés
├── Dockerfile.api                Image FastAPI + Pipeline ML (python:3.12-slim)
├── requirements.txt              Toutes les dépendances Python
├── README.md                     Ce fichier
│
├── artefacts/                    Mets ici tes 5 fichiers ML
│   ├── lgbm_final.pkl            Modèle LightGBM entraîné (joblib)
│   ├── woe_transformers.pkl      Paramètres WOE gelés (dict de transformateurs)
│   ├── nap_features.pkl          Liste ordonnée des N features retenues
│   ├── iv_scores_final.csv       Information Value par feature (colonnes: feature, iv)
│   └── feature_stats.json        Statistiques + is_declarative + formule (enrichi)
│
├── app/
│   ├── main.py                   Point d'entrée FastAPI
│   │                             Lifespan : charge artefacts + feature_metadata + seuils
│   │                             Monte les 7 routers
│   │                             Route GET /health
│   │
│   ├── core/
│   │   ├── config.py             Settings Pydantic — lit toutes les env vars du .env
│   │   └── security.py           JWT encode/decode — dépendances require_agent/superviseur/admin
│   │
│   ├── routers/
│   │   ├── auth.py               POST /api/auth/login — POST /api/auth/logout
│   │   ├── scoring.py            GET  /api/scoring/form-schema
│   │   │                         POST /api/scoring/predict
│   │   │                         POST /api/scoring/simulate
│   │   │                         GET  /api/scoring/history/{id}
│   │   ├── clients.py            GET  /api/clients/search
│   │   │                         GET  /api/clients/{id}
│   │   │                         POST /api/clients
│   │   ├── decisions.py          GET  /api/decisions/pending-review
│   │   │                         POST /api/decisions/{id}/override
│   │   │                         GET  /api/decisions/{id}/pdf
│   │   ├── dashboard.py          GET  /api/dashboard/statistics
│   │   │                         GET  /api/dashboard/score-distribution
│   │   │                         GET  /api/dashboard/client-percentile/{cid}/{did}
│   │   ├── monitoring.py         GET  /api/monitoring/model-drift
│   │   │                         GET  /api/monitoring/model-versions
│   │   │                         POST /api/monitoring/promote-model
│   │   └── admin.py              GET  /api/admin/users
│   │                             POST /api/admin/users
│   │                             PUT  /api/admin/users/{id}/toggle
│   │                             PUT  /api/admin/thresholds
│   │
│   ├── services/
│   │   ├── pipeline_service.py   Orchestration : assembler_vecteur + appel tous les services
│   │   │                         evaluer_formule() — évalue les formules déclaratives
│   │   ├── rho_service.py        calculer_rho() — ρc avant WOE
│   │   │                         generer_recommandation() — docs à demander si ρc < 0.40
│   │   ├── shap_service.py       calculer_shap() — TreeSHAP top N
│   │   │                         generer_phrase_shap() — substitution gabarits
│   │   ├── pdo_service.py        pd_to_score() — formule PDO
│   │   │                         get_decision() — règle ACCORDÉ/REFUSÉ/REVUE
│   │   ├── psi_service.py        calculer_psi() — Population Stability Index
│   │   │                         interpreter_psi() — STABLE/ATTENTION/DERIVE
│   │   ├── percentile_service.py calculer_percentile() — position dans distribution mensuelle
│   │   └── pdf_client.py         generer_pdf() — appel HTTP vers pdf-worker
│   │
│   ├── db/
│   │   ├── mongodb.py            connect_db() / disconnect_db() — Motor async
│   │   │                         Création des index au démarrage
│   │   └── collections.py        Accès nommé : col_clients(), col_decisions(), etc.
│   │
│   └── schemas/
│       ├── scoring.py            ScoringInput, ScoringOutput, SimulationInput, FormSchema
│       ├── client.py             ClientCreateRequest, ClientResponse
│       ├── auth.py               LoginRequest, TokenResponse
│       ├── decision.py           OverrideRequest, DecisionResponse
│       └── monitoring.py         PSIResponse, ModelVersionResponse
│
├── adapters/
│   ├── base_adapter.py           Interface abstraite — contrat pour tout Data Adapter
│   │                             get_client_features(id) → dict features historiques
│   │                             get_client_profile(id)  → dict profil civil
│   │                             list_all_client_ids()   → liste IDs
│   └── home_credit_adapter.py    Implémentation Home Credit
│                                 load_data() — charge les 7 CSV en mémoire (une seule fois)
│                                 get_client_features(HC-{SK_ID}) — calcule toutes les features
│                                 get_client_profile(HC-{SK_ID})  — retourne profil avec noms fictifs
│                                 Noms fictifs Cameroun + Tunisie (déterministe par SK_ID)
│
├── mock/
│   └── mock_artefacts.py         get_mock_artefacts() — retourne dict avec objets factices
│                                 MockModel.predict_proba() — scores cohérents pseudo-aléatoires
│                                 MockWOETransformer.transform() — pass-through
│
├── pdf-worker/
│   ├── Dockerfile.pdf            python:3.12-slim + libpango + libcairo + WeasyPrint
│   └── main.py                   POST /generate-pdf → HTML + SVG inline → PDF bytes
│                                 score_gauge_svg() — jauge graphique colorée
│                                 rho_circle_svg() — cercle ρc avec pourcentage
│                                 build_html() — template complet 6 sections
│                                 GET /health
│
└── scripts/
    ├── create_admin.py           Crée le 1er compte ADMIN dans MongoDB
    │                             --username et --password configurables
    ├── generate_metadata.py      LLM Gemini Flash (ou Anthropic) → feature_metadata MongoDB
    │                             build_prompt() — prompt structuré par type de feature
    │                             call_llm() — appel API avec retry x3
    │                             --run-id et --dry-run disponibles
    ├── register_model.py         Enregistre un modèle en STAGING ou PRODUCTION dans MongoDB
    │                             --promote passe directement en PRODUCTION
    │                             --auc --gini --ks pour les métriques
    └── seed_database.py          ETL Home Credit CSV → MongoDB clients
                                  HomeCreditAdapter.load_data() → tous les CSV en mémoire
                                  Insert par batches de 500
                                  --limit N pour tester
                                  --reset pour recommencer
```

---

## 15. Commandes utiles

> **Note :** sur Ubuntu avec Docker 29+, la commande est `docker compose` (avec espace, pas de tiret).
> Vérifie ta version : `docker --version && docker compose version`

### Démarrage / arrêt

```bash
# Démarrer tout (1ère fois ou après modif du code)
docker compose up --build -d

# Démarrer sans reconstruire (démarrage rapide)
docker compose up -d

# Vérifier que les 4 conteneurs sont Up
docker compose ps

# Arrêter tout (les données MongoDB sont conservées)
docker compose down

# Arrêter et effacer les données (REMET LA BASE À ZÉRO)
docker compose down -v
```

### Logs — suivre en temps réel

```bash
# Logs de l'API FastAPI (le plus utile au quotidien)
docker compose logs -f api

# Logs MongoDB
docker compose logs -f mongodb

# Logs du PDF worker
docker compose logs -f pdf-worker

# Logs MLflow
docker compose logs -f mlflow

# Logs de tous les conteneurs en même temps
docker compose logs -f

# Voir les 50 dernières lignes de l'API sans suivre
docker compose logs --tail=50 api
```

### Redémarrage

```bash
# Redémarrer uniquement l'API (après modif de .env ou scripts de setup)
docker compose restart api

# Reconstruire l'image API après modification du code Python
docker compose up --build -d api

# Redémarrer tous les conteneurs
docker compose restart
```

### Inspection MongoDB

```bash
# Ouvrir le shell MongoDB directement
docker exec -it scoring-mongodb mongosh scoring_db

# Dans mongosh — compter les clients insérés
db.clients.countDocuments()
db.clients.findOne()

# Dans mongosh — voir les décisions récentes
db.decisions.find().sort({timestamp: -1}).limit(3)

# Dans mongosh — vérifier les feature_metadata
db.feature_metadata.countDocuments()
db.feature_metadata.findOne({feature: "EXT_SOURCE_2"})
```

### Divers

```bash
# Vérifier la santé du backend
curl http://localhost:8080/health

# Accéder à Swagger UI (dans le navigateur)
# http://localhost:8080/docs

# Accéder à MLflow UI (dans le navigateur)
# http://localhost:5000

# Générer un secret JWT fort
python -c "import secrets; print(secrets.token_hex(32))"

# Voir les versions Docker installées
docker --version
docker compose version
```

---

## 16. Endpoints complets

| Méthode | Route | Rôle requis | Description |
|---------|-------|-------------|-------------|
| POST | `/api/auth/login` | Public | Connexion, retourne JWT |
| POST | `/api/auth/logout` | Tous | Invalidation du token |
| GET | `/api/scoring/form-schema` | AGENT+ | Schéma dynamique du formulaire |
| POST | `/api/scoring/predict` | AGENT+ | Scoring complet + sauvegarde MongoDB |
| POST | `/api/scoring/simulate` | AGENT+ | Simulation what-if sans sauvegarde |
| GET | `/api/scoring/history/{client_id}` | AGENT+ | Évolution du score dans le temps |
| GET | `/api/clients/search?q=` | AGENT+ | Recherche multi-critères |
| GET | `/api/clients/{id}` | AGENT+ | Profil complet d'un client |
| POST | `/api/clients` | AGENT+ | Créer un nouveau client |
| GET | `/api/decisions/pending-review` | SUPERVISEUR+ | File de revue manuelle |
| POST | `/api/decisions/{id}/override` | SUPERVISEUR+ | Valider ou rejeter une revue |
| GET | `/api/decisions/{id}/pdf` | AGENT+ | Rapport PDF complet |
| GET | `/api/dashboard/statistics` | SUPERVISEUR+ | Statistiques globales |
| GET | `/api/dashboard/score-distribution` | SUPERVISEUR+ | Distribution des scores PDO |
| GET | `/api/dashboard/client-percentile/{cid}/{did}` | SUPERVISEUR+ | Position percentile d'un client |
| GET | `/api/monitoring/model-drift` | SUPERVISEUR+ | PSI dérive du modèle |
| GET | `/api/monitoring/model-versions` | SUPERVISEUR+ | Liste des versions de modèles |
| POST | `/api/monitoring/promote-model` | ADMIN | Promotion STAGING → PRODUCTION |
| GET | `/api/admin/users` | ADMIN | Liste des utilisateurs |
| POST | `/api/admin/users` | ADMIN | Créer un utilisateur |
| PUT | `/api/admin/users/{id}/toggle` | ADMIN | Activer / désactiver un compte |
| PUT | `/api/admin/thresholds` | ADMIN | Configurer les seuils PDO |
| GET | `/health` | Public | Santé du service |

---

*Généré le 30/05/2026 — ENSPY GI2026 / IT Nearshore — Singhe Penka Hendrix Donavan 21P05A*
