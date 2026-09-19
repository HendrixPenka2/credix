# Journal des modifications — scoring-backend
> Session de mise en place complète du backend. Toutes les modifications listées ici ont été nécessaires pour faire fonctionner le projet depuis zéro sur Ubuntu.

---

## 1. Environnement Python local (conda)

### Problème
Les scripts de setup (`create_admin.py`, `generate_metadata.py`, etc.) tournent **localement** (pas dans Docker). Ils ont besoin de Python + les mêmes dépendances que le backend.

### Solution — création de l'environnement conda
```bash
conda create -n scoring-backend python=3.12
conda activate scoring-backend
pip install -r requirements.txt
```

### Activation dans un nouveau terminal
Si `conda activate` échoue avec `Run 'conda init' before 'conda activate'` :
```bash
source /home/donpk/anaconda3/etc/profile.d/conda.sh
conda activate scoring-backend
```
Pour que ce soit permanent (une seule fois) :
```bash
conda init bash
# Puis fermer et rouvrir le terminal
```

### Fix bcrypt — incompatibilité passlib 1.7.4 avec bcrypt ≥ 4.1.0
`passlib 1.7.4` est incompatible avec les nouvelles versions de `bcrypt`. Symptôme : `ValueError: password cannot be longer than 72 bytes` lors du hash d'un mot de passe.
```bash
pip install "bcrypt==4.0.1"
```

---

## 2. Fichier `.env`

### Modification : MONGO_URI
**Avant :**
```
MONGO_URI=mongodb://mongodb:27017
```
**Après :**
```
MONGO_URI=mongodb://localhost:27017
```

**Pourquoi :** `mongodb` est le nom DNS interne Docker — il ne fonctionne qu'à l'intérieur des conteneurs. Les scripts locaux (create_admin, seed_database, etc.) se connectent à MongoDB via le port exposé `27017` sur `localhost`. Le `docker-compose.yml` écrase cette valeur pour les conteneurs via le bloc `environment:`.

---

## 3. `docker-compose.yml`

### Modification 1 : suppression de `version: "3.9"`
**Avant :**
```yaml
version: "3.9"
services:
  ...
```
**Après :**
```yaml
services:
  ...
```
**Pourquoi :** Docker Compose v2 (commande `docker compose` avec espace) considère cette ligne comme obsolète et affiche un avertissement. Elle est ignorée dans Compose v2.

### Modification 2 : port externe 8000 → 8080
**Avant :**
```yaml
ports:
  - "8000:8000"
```
**Après :**
```yaml
ports:
  - "8080:8000"
```
**Pourquoi :** Le port 8000 de la machine hôte était déjà occupé par un autre projet (`agt-asssist-backend_api`). Le port interne du conteneur reste 8000 (le Dockerfile et le healthcheck ne changent pas). Seul le mapping externe change. L'API est maintenant accessible sur `http://localhost:8080`.

---

## 4. `Dockerfile.api`

### Modification 1 : ajout de `libgomp1`
**Avant :**
```dockerfile
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```
**Après :**
```dockerfile
RUN apt-get update && apt-get install -y curl libgomp1 && rm -rf /var/lib/apt/lists/*
```
**Pourquoi :** LightGBM requiert OpenMP (`libgomp.so.1`) pour fonctionner. L'image `python:3.12-slim` ne l'inclut pas. Sans cette librairie, le backend crashe au démarrage avec `OSError: libgomp.so.1: cannot open shared object file`.

### Modification 2 : timeout et retries pip
**Avant :**
```dockerfile
RUN pip install --no-cache-dir -r requirements.txt
```
**Après :**
```dockerfile
RUN pip install --no-cache-dir --timeout 300 --retries 5 -r requirements.txt
```
**Pourquoi :** Connexion internet lente (~43 kB/s). Sans timeout étendu, pip abandonne les téléchargements de gros packages (lightgbm, shap) avant la fin.

---

## 5. `pdf-worker/Dockerfile.pdf`

### Modification : nom du package libgdk-pixbuf
**Avant :**
```dockerfile
libgdk-pixbuf2.0-0 \
```
**Après :**
```dockerfile
libgdk-pixbuf-xlib-2.0-0 \
```
**Pourquoi :** Dans Debian Trixie (base de `python:3.12-slim`), le package a été renommé. L'ancien nom n'existe plus dans les dépôts APT de cette version.

---

## 6. `requirements.txt`

### Modification 1 : scikit-learn 1.5.0 → 1.6.1
**Avant :**
```
scikit-learn==1.5.0
```
**Après :**
```
scikit-learn==1.6.1
```
**Pourquoi :** `optbinning==0.21.0` requiert `scikit-learn >= 1.6.0`. La version 1.5.0 provoquait une erreur de dépendance à l'installation pip.

### Modification 2 : ajout de bcrypt==4.0.1
**Avant :** *(absent)*

**Après :**
```
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
```
**Pourquoi :** `passlib[bcrypt]` sans version pinnée installe la dernière version de bcrypt (5.x), incompatible avec passlib 1.7.4. En épinglant `bcrypt==4.0.1`, on garantit la compatibilité dans le conteneur Docker ET dans l'environnement conda local.

---

## 7. `scripts/generate_metadata.py`

### Modification 1 : modèle Gemini déprécié
**Avant :**
```python
model = genai.GenerativeModel("gemini-1.5-flash")
```
**Après :**
```python
model = genai.GenerativeModel("gemini-2.5-flash")
```
**Pourquoi :** `gemini-1.5-flash` n'existe plus dans l'API v1beta de Google Generative AI. Retournait une erreur 404. `gemini-2.5-flash` est le meilleur modèle gratuit disponible (vérifié avec `genai.list_models()`).

### Limite quota Gemini free tier — résultat partiel

Le tier gratuit de l'API Google Gemini est limité à **20 requêtes par jour** pour le modèle `gemini-2.5-flash` (erreur HTTP 429 : `Quota exceeded for metric: GenerateRequestsPerDayPerProjectPerModel-FreeTier`).

Le script traite les 27 features dans l'ordre. Résultat obtenu :
- **22 features → OK** (générées correctement par Gemini)
- **5 features → FALLBACK** (quota épuisé après 20 appels, certaines ont récupéré entre les tentatives de retry)

Features en fallback (libellé = nom technique anglais brut, gabarits génériques) :
`CODE_GENDER`, `NAME_INCOME_TYPE`, `pos_avg_dpd_all`, `registration_years`, `std_payment_ratio`

Ces features fonctionnent mais ont des descriptions non présentables pour un agent bancaire. Corrections manuelles appliquées (voir Section 10).

**Pour régénérer les 5 features manquantes demain** (après reset du quota) : relancer simplement `python scripts/generate_metadata.py --run-id lgbm-run-v1` — le script fait un `upsert` et écrase les entrées existantes. Attention : les 22 premières features seront retraitées et consommeront à nouveau du quota, donc les mêmes 5 risquent de refaire FALLBACK. Solution propre : modifier le script pour skipper les features déjà validées.

### Modification 2 : bug FALLBACK_TEMPLATE avec les listes
**Avant :**
```python
llm_result = {k: v.replace("{feature}", feature) for k, v in FALLBACK_TEMPLATE.items()}
```
**Après :**
```python
llm_result = {k: (v.replace("{feature}", feature) if isinstance(v, str) else v) for k, v in FALLBACK_TEMPLATE.items()}
```
**Pourquoi :** `FALLBACK_TEMPLATE` contient `"seuils": []` — une liste, pas une chaîne. `.replace()` n'existe pas sur les listes → `AttributeError`. Le fix applique `.replace()` uniquement aux valeurs de type `str`.

---

## 8. `adapters/home_credit_adapter.py`

### Modification 1 : `_nan()` — conversion des types numpy
**Avant :**
```python
def _nan(self, val):
    """Convertit NaN pandas en None Python."""
    if pd.isna(val):
        return None
    return val
```
**Après :**
```python
def _nan(self, val):
    """Convertit NaN pandas en None Python et types numpy en types Python natifs."""
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(val, np.integer):
        return int(val)
    if isinstance(val, np.floating):
        return float(val)
    if isinstance(val, np.bool_):
        return bool(val)
    return val
```
**Pourquoi :** Pandas stocke les valeurs CSV en types numpy (`numpy.int64`, `numpy.float64`). pymongo/motor utilise BSON pour sérialiser les documents, et BSON ne connaît que les types Python natifs (`int`, `float`, `bool`, `None`). Sans cette conversion, 100% des insertions échouaient silencieusement.

### Modification 2 : `timedelta` refuse numpy.int64
**Avant :**
```python
age_years = abs(row.get("DAYS_BIRTH", 0)) / 365.25
from datetime import date, timedelta
dob = date.today() - timedelta(days=abs(row.get("DAYS_BIRTH", 0)))
```
**Après :**
```python
days_birth = int(row.get("DAYS_BIRTH", 0))
age_years = abs(days_birth) / 365.25
from datetime import date, timedelta
dob = date.today() - timedelta(days=abs(days_birth))
```
**Pourquoi :** `timedelta(days=numpy.int64)` lève `TypeError: unsupported type for timedelta days component: numpy.int64`. Python's `timedelta` n'accepte que des `int` natifs. La conversion explicite `int(...)` résout le problème.

---

## 9. `scripts/seed_database.py`

### Modification 1 : ajout de `_sanitize()` pour les types numpy
**Ajout :**
```python
import numpy as np

def _sanitize(obj):
    """Convertit récursivement les types numpy en types Python natifs pour pymongo."""
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
```
**Pourquoi :** Filet de sécurité général — certaines features dans `get_client_features()` sont calculées directement sans passer par `_nan()` (ex: divisions de colonnes pandas). Cette fonction balaye récursivement tout le document avant insertion pour garantir qu'aucun type numpy ne reste.

### Modification 2 : application de `_sanitize()` avant insertion
**Avant :**
```python
profile = await adapter.get_client_profile(client_id)
features = await adapter.get_client_features(client_id)
doc = {
    "client_id": client_id,
    ...
```
**Après :**
```python
profile = await adapter.get_client_profile(client_id)
features = await adapter.get_client_features(client_id)
profile = _sanitize(profile)
features = _sanitize(features)
doc = {
    "client_id": client_id,
    ...
```

### Modification 3 : affichage des 3 premières erreurs (debug)
**Avant :**
```python
except Exception as e:
    errors += 1
```
**Après :**
```python
except Exception as e:
    errors += 1
    if errors <= 3:
        print(f"  [ERREUR] client {client_id}: {e}")
```
**Pourquoi :** Le script avalait les erreurs silencieusement, rendant le diagnostic impossible. Cette ligne affiche les 3 premières erreurs pour identifier rapidement la cause.

---

## 10. Corrections manuelles MongoDB (feature_metadata)

### Libellés Gemini incorrects
Gemini a retourné son propre rôle (le texte du prompt) au lieu d'un label de feature :
```bash
docker exec -it scoring-mongodb mongosh scoring_db --eval "
db.feature_metadata.updateOne(
  {feature: 'NAME_EDUCATION_TYPE'},
  {\$set: {libelle_agent: \"Niveau d'éducation du demandeur\"}}
);
db.feature_metadata.updateOne(
  {feature: 'ORGANIZATION_TYPE'},
  {\$set: {libelle_agent: \"Secteur d'activité de l'employeur\"}}
);"
```

### Features fallback (quota Gemini épuisé)
5 features ont reçu un template générique (nom technique anglais). Corrections manuelles :
```bash
docker exec -it scoring-mongodb mongosh scoring_db --eval "
db.feature_metadata.updateOne({feature: 'CODE_GENDER'}, {\$set: {libelle_agent: 'Genre du demandeur', gabarit_aggravant: \"Le genre du demandeur ({valeur}) est associé à un risque de défaut plus élevé.\", document_recommande: 'Pièce d identité'}});
db.feature_metadata.updateOne({feature: 'NAME_INCOME_TYPE'}, {\$set: {libelle_agent: \"Type de revenus du demandeur\", gabarit_aggravant: \"Le type de revenus '{valeur}' est associé à un risque de défaut élevé.\", document_recommande: 'Justificatif de revenus'}});
db.feature_metadata.updateOne({feature: 'pos_avg_dpd_all'}, {\$set: {libelle_agent: 'Retard moyen de paiement POS (jours)', gabarit_aggravant: \"Un retard moyen de {valeur:.2f} jours sur les paiements POS est un facteur aggravant.\", document_recommande: 'Historique de remboursement'}});
db.feature_metadata.updateOne({feature: 'registration_years'}, {\$set: {libelle_agent: \"Ancienneté d'enregistrement du domicile\", gabarit_aggravant: \"Une ancienneté d'enregistrement de {valeur:.2f} ans est un facteur aggravant du risque.\", document_recommande: 'Justificatif de domicile'}});
db.feature_metadata.updateOne({feature: 'std_payment_ratio'}, {\$set: {libelle_agent: 'Variabilité des remboursements', gabarit_aggravant: \"Une forte variabilité des remboursements ({valeur:.2f}) indique une instabilité financière.\", document_recommande: 'Relevés bancaires'}});"
```

---

## 11. Bug identifié — features manquantes dans l'adapter

### État actuel
`HomeCreditAdapter.get_client_features()` stocke **33 features** dans MongoDB, mais le modèle LightGBM a été entraîné sur **27 features spécifiques**. Plusieurs features du modèle ne sont pas extraites par l'adapter :

| Feature du modèle | État dans l'adapter |
|---|---|
| `EXT_SOURCE_1` | ❌ Oublié — présent dans le CSV mais jamais extrait |
| `OCCUPATION_TYPE` | ❌ Stocké dans `profile.type_emploi` mais absent de `features` |
| `avg_payment_diff` | ❌ Jamais calculé |
| `std_payment_ratio` | ❌ Jamais calculé |
| `pos_avg_dpd_all` | ❌ Stocké comme `pos_dpd_moyen_3m` (nom différent) |
| `registration_years` | ❌ Jamais calculé |
| `prev_avg_down_payment` | ❌ Non extrait de `previous_application.csv` |

### Conséquence
Lors d'un scoring, `pipeline_service.py` lit ces features depuis MongoDB. Si une feature est absente → retourne `None` → traité comme `0.0` après transformation WOE. Le modèle ne plante pas mais prédit avec des valeurs manquantes, ce qui dégrade la précision.

### À corriger
Compléter `get_client_features()` dans `adapters/home_credit_adapter.py` pour extraire les 7 features manquantes.

---

## Récapitulatif des commandes d'initialisation (dans l'ordre)

```bash
# 1. Activer l'environnement conda
source /home/donpk/anaconda3/etc/profile.d/conda.sh
conda activate scoring-backend

# 2. Build et démarrage Docker
docker compose up --build -d

# 3. Vérification santé
curl http://localhost:8080/health
# Attendu : {"statut":"ok","features_chargees":27,"mock_mode":false}

# 4. Créer l'admin
python scripts/create_admin.py --username admin --password <votre_mot_de_passe>

# 5. Générer les métadonnées features (LLM Gemini)
python scripts/generate_metadata.py --run-id lgbm-run-v1

# 6. Enregistrer le modèle dans MLflow/MongoDB
python scripts/register_model.py --run-id lgbm-run-v1 --version 1.0.0 --promote --auc 0.762 --gini 0.524 --ks 0.41

# 7. Seeder la base de données clients
python scripts/seed_database.py --limit 500 --reset
```
