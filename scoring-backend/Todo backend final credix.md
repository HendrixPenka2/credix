# TODO — BACKEND FINAL CREDIX
## Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY Yaoundé I
## Système : CREDIX — Scoring de Risque de Crédit
## Créé : 25 juin 2026

================================================================
## CONTEXTE ET ÉTAT DE DÉPART
================================================================

### Ce qui existe et fonctionne (ne pas toucher)

- Pipeline WOE + LightGBM + SHAP + PDO + ρc : OK
- 7 routers existants : auth, scoring, clients, decisions,
  dashboard, monitoring, admin — tous validés
- 20/21 endpoints testés et fonctionnels en session 5
- MongoDB : 7 collections opérationnelles
- Bug WOE corrigé (session 5) — scores discriminés ✓
- Règle thin-file : ρc < 0.25 ET score < seuil → REFUSÉ ✓

### Les 5 artefacts actuels dans ./artefacts/

  woe_transformers.pkl      ← WOE (OptimalBinning)
  nap_features.pkl          ← liste des 27 features NAP
  lgbm_final.pkl            ← modèle LightGBM
  iv_scores_final.csv       ← IV par feature (base ρc)
  feature_stats.json        ← statistiques features (schéma API)

### Les 4 nouveaux artefacts IF générés (Section 11 notebook)

  isolation_forest.pkl      ← IF entraîné sur 199 444 bons payeurs
  scaler_if.pkl             ← dict{scaler, medians, features}
                               scaler   : StandardScaler (numériques)
                               medians  : dict feature→médiane train
                               features : liste features numériques
  encoder_if.pkl            ← FrequencyEncoder (catégorielles)
                               dict {feature: {valeur: fréquence}}
  if_metadata.json          ← config complète IF :
                               seuil_if       : valeur P95
                               seuil_percentile: 95
                               features_num   : liste numériques
                               features_cat   : liste catégorielles
                               features_total : toutes features IF
                               fp_rate_p95    : taux FP au seuil
                               tp_rate_p95    : taux TP au seuil
                               n_estimators   : 200
                               contamination  : 0.05
                               auc_proxy_val  : score proxy val
                               corr_pd_lgbm   : corrélation avec LGB

### Problèmes identifiés à corriger

PROBLÈME 1 — Versioning fictif
  promote_model() appelle charger_artefacts(app) sans run_id.
  Résultat : toujours chargé depuis ./artefacts/ peu importe
  le run_id promu. Le versioning affiché est une illusion.

PROBLÈME 2 — Pas d'upload possible
  Le data scientist (ou admin) doit avoir accès SSH/docker
  au serveur pour déposer ses fichiers. Inadmissible.

PROBLÈME 3 — IF non intégré
  Les 4 nouveaux artefacts existent mais ne sont ni chargés
  ni utilisés dans le pipeline de scoring.

================================================================
## DÉCISIONS ARCHITECTURALES FIGÉES
================================================================

- GridFS bucket name : "artefacts_ml"
- run_id = UUID v4 généré par le backend à l'upload (jamais par l'admin)
- Le dossier ./artefacts/ reste le seed initial — jamais supprimé
- /tmp/artefacts/{run_id}/ nettoyé après chargement en RAM
- Upload fait par l'admin (role ADMIN) — pas de rôle DS distinct
- register-model (MLflow) = perspective future ; upload-model = réalité
- 9 artefacts uploadés ensemble sous le même run_id
- Rollback = POST /promote-model avec un ancien run_id (GridFS conserve tout)
- Un seul modèle PRODUCTION à la fois (comportement déjà en place)
- IF ne peut qu'escalader une décision, jamais la diminuer
- Rétrocompatibilité seed : si IF absent de ./artefacts/ → warning + continue

================================================================
## CHANTIER 1 — GRIDFS VERSIONING
================================================================

### Vue d'ensemble du flux cible

  [Admin depuis n'importe où]
    POST /api/admin/upload-model (multipart — 9 fichiers)
      → backend stocke chaque fichier dans GridFS
      → génère run_id = UUID4
      → insère col_modeles { run_id, statut: STAGING, ... }
      → retourne { run_id, statut, fichiers_recus }

  [Admin via UI]
    GET /api/monitoring/model-versions
      → liste STAGING / PRODUCTION / ARCHIVE avec métriques

    POST /api/monitoring/promote-model { run_id }
      → télécharge fichiers GridFS → /tmp/artefacts/{run_id}/
      → charge en RAM via charger_artefacts(app, run_id)
      → nettoie /tmp/ après chargement
      → MongoDB : run_id → PRODUCTION, ancien → ARCHIVE

  [Démarrage à froid]
    lifespan() cherche modèle PRODUCTION dans col_modeles
      → Si trouvé avec GridFS : charge depuis GridFS
      → Sinon : fallback ./artefacts/ (seed initial)

---

### ÉTAPE 1.1 — Créer app/db/gridfs.py

Fichier : app/db/gridfs.py (NOUVEAU)

Contenu à implémenter :

```python
"""
Utilitaires GridFS async pour CREDIX.
Bucket : "artefacts_ml" (séparé des collections métier).
"""
import io
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from app.db.mongodb import get_db


def get_gridfs_bucket() -> AsyncIOMotorGridFSBucket:
    """Retourne le bucket GridFS async."""
    db = get_db()
    return AsyncIOMotorGridFSBucket(db, bucket_name="artefacts_ml")


async def sauvegarder_artefact(run_id: str, nom_fichier: str,
                                contenu_bytes: bytes) -> str:
    """
    Stocke un fichier dans GridFS.
    Metadata : run_id + nom_fichier pour retrouver le fichier.
    Retourne l'id GridFS (str).
    Si un fichier du même run_id+nom existe déjà → le supprimer avant.
    """


async def telecharger_artefact(run_id: str,
                                nom_fichier: str) -> bytes:
    """
    Télécharge un fichier depuis GridFS par run_id + nom_fichier.
    Lève FileNotFoundError si absent.
    """


async def lister_artefacts(run_id: str) -> list[str]:
    """
    Liste les noms de fichiers stockés pour un run_id donné.
    Retourne [] si run_id inexistant.
    """


async def supprimer_artefacts(run_id: str) -> int:
    """
    Supprime tous les fichiers GridFS d'un run_id.
    Utilisé si l'admin rejette un upload STAGING.
    Retourne le nombre de fichiers supprimés.
    """
```

Critères de validation étape 1.1 :
[ ] sauvegarder_artefact() stocke et retourne un id valide
[ ] telecharger_artefact() retourne exactement les bytes envoyés
[ ] lister_artefacts() retourne la liste correcte des noms
[ ] supprimer_artefacts() supprime bien tous les fichiers du run_id
[ ] Deux saves du même run_id+nom : le second écrase le premier
[ ] FileNotFoundError levé si fichier absent

---

### ÉTAPE 1.2 — Créer app/routers/upload_model.py

Fichier : app/routers/upload_model.py (NOUVEAU)

Endpoint : POST /api/admin/upload-model
Rôle requis : ADMIN
Content-Type : multipart/form-data

Champs multipart attendus (tous obligatoires) :

  Champ multipart        Fichier                    Type
  ─────────────────────────────────────────────────────
  woe_transformers       woe_transformers.pkl       .pkl
  nap_features           nap_features.pkl           .pkl
  lgbm_model             lgbm_final.pkl             .pkl
  iv_scores              iv_scores_final.csv        .csv
  feature_stats          feature_stats.json         .json
  isolation_forest       isolation_forest.pkl       .pkl
  scaler_if              scaler_if.pkl              .pkl
  encoder_if             encoder_if.pkl             .pkl
  if_metadata            if_metadata.json           .json

Champs form data texte :
  nom_version    : str  (ex: "lgbm-v2-juin2026")
  description    : str  (ex: "Re-entraîné sur 120k obs, AUC 0.79")
  metriques      : str  (JSON stringifié — ex: '{"auc_roc":0.79}')

Logique à implémenter :

  1. Vérifier que les 9 fichiers obligatoires sont présents
     → 422 si un fichier manque (indiquer lequel)
  2. Générer run_id = str(uuid.uuid4())
  3. Pour chaque fichier : sauvegarder_artefact(run_id, nom, bytes)
  4. Parser metriques (JSON string → dict, défaut {} si erreur)
  5. Insérer dans col_modeles :
     {
       run_id, nom_version, description, statut: "STAGING",
       date_upload: now, uploaded_by: current_user["sub"],
       metriques: {...}, fichiers_gridfs: [liste des 9 noms]
     }
  6. Retourner { run_id, statut: "STAGING",
                 fichiers_recus: [liste], message: "..." }

Critères de validation étape 1.2 :
[ ] Upload 9 fichiers → run_id retourné + statut STAGING
[ ] GET /model-versions montre la nouvelle version STAGING
[ ] Upload avec fichier manquant → 422 + message explicite
[ ] Upload sans token → 401
[ ] Upload avec token AGENT → 403
[ ] Les fichiers sont bien dans GridFS après upload
[ ] metriques malformées (JSON invalide) → défaut {} sans crash

---

### ÉTAPE 1.3 — Modifier app/main.py (charger_artefacts)

Fichier : app/main.py (MODIFICATION)
Fonction : charger_artefacts(app, run_id=None)

Logique AVANT (actuelle) :
  Lit toujours depuis {artefacts_dir}/{nom_fichier}

Logique APRÈS :

```
si run_id fourni :
    pour chaque artefact attendu :
        bytes = await telecharger_artefact(run_id, nom_fichier)
        écrire dans /tmp/artefacts/{run_id}/{nom_fichier}
    charger depuis /tmp/artefacts/{run_id}/
    nettoyer /tmp/artefacts/{run_id}/ après chargement
sinon :
    charger depuis {artefacts_dir}/ (seed fallback)
```

Liste des 9 artefacts à gérer (avec leur nom de champ app.state) :

  Fichier GridFS              app.state              Loader
  ──────────────────────────────────────────────────────────
  woe_transformers.pkl        woe_transformers       joblib.load
  nap_features.pkl            nap_features           joblib.load
  lgbm_final.pkl              lgbm_model             joblib.load
  iv_scores_final.csv         iv_scores              pd.read_csv
  feature_stats.json          feature_stats          json.load
  isolation_forest.pkl        isolation_forest       pickle.load
  scaler_if.pkl               scaler_if              pickle.load
  encoder_if.pkl              encoder_if             pickle.load
  if_metadata.json            if_metadata            json.load

Rétrocompatibilité seed (fallback ./artefacts/) :
  - Les 5 anciens artefacts : chargés normalement
  - Les 4 artefacts IF : si absents → log WARNING + mettre None
    app.state.isolation_forest = None
    app.state.scaler_if = None
    app.state.encoder_if = None
    app.state.if_metadata = None
  - Le pipeline vérifiera app.state.isolation_forest is not None
    avant d'appliquer le Flux B

app.state.model_run_id = run_id ou "seed-initial" si fallback

Critères de validation étape 1.3 :
[ ] GET /health retourne les 9 artefacts chargés après promote
[ ] Fallback seed : 5 artefacts OK + warning IF absent en logs
[ ] /tmp/ nettoyé après chargement (vérifier ls /tmp/artefacts/)
[ ] model_run_id = le vrai run_id promu (pas "lgbm-run-v1")

---

### ÉTAPE 1.4 — Modifier app/routers/monitoring.py (promote_model)

Fichier : app/routers/monitoring.py (MODIFICATION)
Fonction : promote_model()

Modification unique — ligne du rechargement :

AVANT :
  await charger_artefacts(request.app)

APRÈS :
  await charger_artefacts(request.app, run_id=body.run_id)

Critères de validation étape 1.4 :
[ ] Après promote, GET /health montre model_run_id = run_id promu
[ ] Rollback : promote un ancien run_id → artefacts rechargés OK

---

### ÉTAPE 1.5 — Modifier app/main.py (lifespan)

Fichier : app/main.py (MODIFICATION)
Fonction : lifespan()

Logique APRÈS dans le bloc DÉMARRAGE :

```python
await connect_db()

# Chercher un modèle PRODUCTION avec fichiers GridFS
modele_prod = await get_db().col_modeles.find_one({"statut": "PRODUCTION"})
if modele_prod and modele_prod.get("fichiers_gridfs"):
    run_id_prod = modele_prod["run_id"]
    print(f"[Lifespan] Modèle PRODUCTION trouvé : {run_id_prod}")
    await charger_artefacts(app, run_id=run_id_prod)
else:
    print("[Lifespan] Aucun modèle GridFS en PRODUCTION — fallback seed")
    await charger_artefacts(app)

await charger_feature_metadata(app)
await charger_seuils(app)
```

Critères de validation étape 1.5 :
[ ] Restart après promote → bon run_id chargé automatiquement
[ ] Premier lancement (MongoDB vide) → seed fallback sans crash

---

### ÉTAPE 1.6 — Inclure le router dans app/main.py

Fichier : app/main.py (MODIFICATION)

Ajouter dans la section ROUTES :

```python
from app.routers import (auth, scoring, clients, decisions,
                          dashboard, monitoring, admin, upload_model)
app.include_router(upload_model.router)
```

---

### TEST INTÉGRATION CHANTIER 1 (flux complet)

Séquence de test à exécuter dans l'ordre :

TEST C1-1 — Upload initial
  curl -X POST http://localhost:8080/api/admin/upload-model \
    -H "Authorization: Bearer {token_admin}" \
    -F "woe_transformers=@artefacts/woe_transformers.pkl" \
    -F "nap_features=@artefacts/nap_features.pkl" \
    -F "lgbm_model=@artefacts/lgbm_final.pkl" \
    -F "iv_scores=@artefacts/iv_scores_final.csv" \
    -F "feature_stats=@artefacts/feature_stats.json" \
    -F "isolation_forest=@artefacts/isolation_forest.pkl" \
    -F "scaler_if=@artefacts/scaler_if.pkl" \
    -F "encoder_if=@artefacts/encoder_if.pkl" \
    -F "if_metadata=@artefacts/if_metadata.json" \
    -F "nom_version=lgbm-v2-juin2026" \
    -F 'description=Modèle final avec IF zero-day' \
    -F 'metriques={"auc_roc":0.757,"recall":0.726}'
  Attendu : { run_id: "...", statut: "STAGING", fichiers_recus: [9 noms] }

TEST C1-2 — Vérification listing
  GET /api/monitoring/model-versions
  Attendu : version STAGING visible avec le run_id de C1-1

TEST C1-3 — Promotion
  POST /api/monitoring/promote-model { "run_id": "{run_id_C1-1}" }
  Attendu : { message: "Modèle promu...", run_id, promoted_at }

TEST C1-4 — Vérification health post-promotion
  GET /health
  Attendu : { model_run_id: "{run_id_C1-1}", features_chargees: 27 }

TEST C1-5 — Vérification scoring fonctionnel post-promote
  POST /api/scoring/predict (client HC-100001, declaratif habituel)
  Attendu : score correct (pas de régression)

TEST C1-6 — Rollback
  Uploader une 2ème version → promouvoir → re-promouvoir la v1
  Attendu : model_run_id revenu à run_id v1

TEST C1-7 — Upload incomplet
  Upload sans isolation_forest.pkl
  Attendu : 422 + message indiquant "isolation_forest manquant"

TEST C1-8 — Restart
  docker compose restart api
  GET /health → Attendu : même run_id qu'avant le restart

================================================================
## CHANTIER 2 — INTÉGRATION IF DANS LE PIPELINE DE SCORING
================================================================

### Vue d'ensemble du Flux B

Le Flux B opère sur le vecteur brut assemblé (avant WOE).

Flux A (existant) :
  vecteur_brut → WOE → LightGBM → pd_c → score_pdo
               → SHAP → ρc → decision_initiale

Flux B (nouveau) :
  vecteur_brut → imputation NaN (medians) → scaler_if
              → encoder_if → IF.score_samples()
              → comparer à if_metadata["seuil_if"]
              → is_anomaly (bool)

Règle d'escalade :
  si is_anomaly ET decision_initiale == "ACCORDÉ" :
      decision_finale = "REVUE_MANUELLE"
      if_escalade = True
      decision_initiale conservée dans la réponse
  sinon :
      decision_finale = decision_initiale
      if_escalade = False

---

### ÉTAPE 2.1 — Modifier app/services/pipeline_service.py

Fichier : app/services/pipeline_service.py (MODIFICATION)
Fonction : run_pipeline() ou fonction équivalente

Ajouter après le calcul de la décision initiale :

```python
def appliquer_flux_b(vecteur_brut: dict, app_state) -> dict:
    """
    Applique le Flux B (IF zero-day) sur le vecteur brut.
    Retourne un dict avec anomaly_score, is_anomaly, if_escalade.
    Si artefacts IF absents → retourne valeurs neutres sans crash.
    """
    # Garde-fou : IF non chargé → pas d'anomalie signalée
    if (app_state.isolation_forest is None
            or app_state.scaler_if is None
            or app_state.encoder_if is None
            or app_state.if_metadata is None):
        return {"anomaly_score": None,
                "is_anomaly": False,
                "if_escalade": False}

    scaler_bundle = app_state.scaler_if
    scaler      = scaler_bundle["scaler"]
    medians     = scaler_bundle["medians"]
    features_num = scaler_bundle["features"]

    encoder_if   = app_state.encoder_if
    if_metadata  = app_state.if_metadata
    features_cat = if_metadata["features_cat"]
    seuil        = if_metadata["seuil_if"]

    # 1. Imputer NaN numériques avec médianes train
    X_num = []
    for f in features_num:
        val = vecteur_brut.get(f)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = medians.get(f, 0.0)
        X_num.append(float(val))

    # 2. Encoder catégorielles (frequency encoding)
    X_cat = []
    for f in features_cat:
        val = str(vecteur_brut.get(f, ""))
        freq = encoder_if.get(f, {}).get(val, 0.5)
        X_cat.append(freq)

    # 3. Assembler dans l'ordre features_total
    features_total = if_metadata["features_total"]
    num_dict = dict(zip(features_num, scaler.transform([X_num])[0]))
    cat_dict = dict(zip(features_cat, X_cat))
    merged   = {**num_dict, **cat_dict}
    X_if     = np.array([[merged.get(f, 0.0) for f in features_total]])

    # 4. Scorer
    anomaly_score = float(
        app_state.isolation_forest.score_samples(X_if)[0]
    )

    is_anomaly = anomaly_score > seuil
    return {"anomaly_score": round(anomaly_score, 6),
            "is_anomaly": bool(is_anomaly),
            "if_escalade": False}  # escalade gérée par run_pipeline
```

Dans run_pipeline(), après la décision initiale :

```python
# Flux B — zero-day
if_result = appliquer_flux_b(vecteur_brut, request.app.state)

decision_initiale = decision_calculee
if_escalade = False

if (if_result["is_anomaly"]
        and decision_initiale == "ACCORDÉ"):
    decision_finale = "REVUE_MANUELLE"
    if_escalade = True
else:
    decision_finale = decision_initiale
```

Critères de validation étape 2.1 :
[ ] Score IF calculé sans crash pour un client normal
[ ] Client profil normal → is_anomaly False (score < seuil)
[ ] Client profil aberrant (âge 25 / ancienneté 22 ans) → is_anomaly True
[ ] ACCORDÉ + is_anomaly → REVUE_MANUELLE + if_escalade True
[ ] REFUSÉ + is_anomaly → REFUSÉ inchangé + if_escalade False
[ ] Artefacts IF None (seed sans IF) → pas de crash, is_anomaly False

---

### ÉTAPE 2.2 — Modifier la réponse API scoring

Fichier : app/routers/scoring.py (MODIFICATION)
Endpoint : POST /api/scoring/predict

Réponse actuelle (conservée intégralement) :
  demande_id, decision, score_pdo, pd_c, rho_c,
  shap_top5, recommandation_rho, percentile

Nouveaux champs ajoutés :
  decision_initiale  : str|null  — décision LightGBM avant IF
                       (renseigné uniquement si if_escalade=True)
  anomaly_score      : float|null — score IF (null si IF absent)
  is_anomaly         : bool       — dépasse le seuil P95
  if_escalade        : bool       — IF a changé la décision
  if_seuil           : float|null — seuil P95 utilisé

Critères de validation étape 2.2 :
[ ] Réponse contient tous les anciens champs (pas de régression)
[ ] Nouveaux champs présents dans toutes les réponses
[ ] if_escalade=True → decision_initiale renseigné
[ ] if_escalade=False → decision_initiale absent ou null

---

### ÉTAPE 2.3 — Modifier le schéma MongoDB

Fichiers : app/db/collections.py (vérification) +
           app/routers/scoring.py (insertion)

Collection : demandes (ajout) :
  anomaly_score  : float|None
  is_anomaly     : bool
  if_escalade    : bool

Collection : decisions (ajout) :
  anomaly_score  : float|None
  is_anomaly     : bool
  if_escalade    : bool
  decision_initiale : str|None  ← avant escalade IF

Audit log : si if_escalade=True → ajouter dans details :
  { "if_escalade": True,
    "decision_initiale": "ACCORDÉ",
    "anomaly_score": 0.621 }

Critères de validation étape 2.3 :
[ ] Après scoring, MongoDB demandes contient anomaly_score
[ ] Après scoring, MongoDB decisions contient if_escalade
[ ] Si if_escalade=True → audit_log details contient if_escalade

---

### ÉTAPE 2.4 — Vérifier requirements.txt

Fichier : requirements.txt (VÉRIFICATION)

Vérifier que ces packages sont présents :
  python-multipart   ← pour FastAPI UploadFile / multipart
  motor              ← déjà présent (GridFS async)
  scikit-learn       ← IsolationForest + StandardScaler (déjà présent ?)
  numpy              ← déjà présent

Si python-multipart manquant → ajouter + rebuild image Docker.

Critères de validation étape 2.4 :
[ ] docker compose build → aucune erreur d'import
[ ] from motor.motor_asyncio import AsyncIOMotorGridFSBucket → OK
[ ] from fastapi import UploadFile, File → OK

---

### TEST INTÉGRATION CHANTIER 2

TEST C2-1 — Scoring normal sans anomalie
  POST /api/scoring/predict (client profil normal HC-100001)
  Attendu :
    is_anomaly: false
    if_escalade: false
    anomaly_score: float (valeur numérique)
    decision: inchangée par rapport à avant intégration IF

TEST C2-2 — Scoring avec profil aberrant
  Créer client avec âge 25 ans et ancienneté emploi 264 mois (22 ans)
  POST /api/scoring/predict
  Attendu :
    is_anomaly: true
    anomaly_score > if_seuil

TEST C2-3 — Escalade ACCORDÉ → REVUE_MANUELLE
  Trouver ou créer un client dont le score LightGBM ≥ 600 (ACCORDÉ)
  et forcer le profil à être détecté comme anomalie
  Attendu :
    decision: "REVUE_MANUELLE"
    decision_initiale: "ACCORDÉ"
    if_escalade: true

TEST C2-4 — REFUSÉ non affecté par IF
  Client avec score < 500 ET is_anomaly=true
  Attendu :
    decision: "REFUSÉ" (inchangé)
    if_escalade: false

TEST C2-5 — Seed sans IF (compatibilité ascendante)
  Temporairement mettre app.state.isolation_forest = None
  POST /api/scoring/predict
  Attendu : pas de crash, is_anomaly: false, anomaly_score: null

TEST C2-6 — Vérification MongoDB
  Après TEST C2-2 :
  GET /api/decisions/{demande_id} ou direct MongoDB
  Attendu : anomaly_score + is_anomaly présents dans le document

TEST C2-7 — Non-régression complète
  Rejouer les 5 scénarios de la session 5 (HC-100001, HC-100066,
  HC-100067, thin-file, REVUE zone grise)
  Attendu : mêmes scores PDO qu'avant (IF ne change pas le score,
  seulement la décision si ACCORDÉ + anomalie)

================================================================
## CHANTIER 3 — FRONTEND NEXT.JS
================================================================

⚠️  CE CHANTIER SERA TRAITÉ DANS UNE SESSION SÉPARÉE.
    Ne pas commencer avant validation complète des Chantiers 1 et 2.

Périmètre identifié (à détailler en session frontend) :
  - Écran résultat scoring : badge anomalie + message escalade IF
  - File de revue manuelle : colonne IF + indicateur raison escalade
  - PDF de scoring : section IF si is_anomaly=True
  - Aucune modification des écrans auth, clients, dashboard

================================================================
## ORDRE D'EXÉCUTION STRICT
================================================================

[ ] 1.1  Créer app/db/gridfs.py
         Tester unitairement (save → download → delete)

[ ] 1.2  Créer app/routers/upload_model.py
         Tester : curl multipart 9 fichiers → STAGING OK

[ ] 1.3  Modifier app/main.py — charger_artefacts(run_id)
         Tester : promote → /health → model_run_id correct

[ ] 1.4  Modifier app/routers/monitoring.py — promote_model
         Tester : promote → artefacts GridFS en RAM

[ ] 1.5  Modifier app/main.py — lifespan()
         Tester : restart → bon run_id rechargé

[ ] 1.6  Inclure router upload_model dans app/main.py

[ ] ✓   TESTS INTÉGRATION CHANTIER 1 (C1-1 à C1-8)
         Validation complète avant de passer au chantier 2

[ ] 2.4  Vérifier requirements.txt → rebuild si nécessaire

[ ] 2.1  Modifier pipeline_service.py — appliquer_flux_b()
         Tester unitairement appliquer_flux_b avec dict brut

[ ] 2.2  Modifier scoring.py — réponse API
         Tester : nouveaux champs présents + anciens conservés

[ ] 2.3  Modifier insertions MongoDB demandes + decisions
         Tester : champs IF dans MongoDB après scoring

[ ] ✓   TESTS INTÉGRATION CHANTIER 2 (C2-1 à C2-7)
         Validation complète

[ ] ✓   RECETTE FINALE — rejouer les 20 endpoints validés session 5
         Objectif : 0 régression

================================================================
## SCHÉMA MongoDB col_modeles (version finale)
================================================================

{
  run_id           : "uuid-v4",
  nom_version      : "lgbm-v2-juin2026",
  description      : "Modèle final avec IF zero-day",
  statut           : "STAGING",          // STAGING/PRODUCTION/ARCHIVE
  date_upload      : ISODate,
  uploaded_by      : "user_id_admin",
  promoted_at      : ISODate,            // rempli à la promotion
  promoted_by      : "user_id_admin",
  metriques        : {
    auc_roc        : 0.757,
    recall         : 0.726,
    ...                                  // JSON libre fourni à l'upload
  },
  fichiers_gridfs  : [
    "woe_transformers.pkl",
    "nap_features.pkl",
    "lgbm_final.pkl",
    "iv_scores_final.csv",
    "feature_stats.json",
    "isolation_forest.pkl",
    "scaler_if.pkl",
    "encoder_if.pkl",
    "if_metadata.json"
  ]
}

================================================================
## RÉCAPITULATIF DES FICHIERS TOUCHÉS
================================================================

NOUVEAUX :
  app/db/gridfs.py
  app/routers/upload_model.py

MODIFIÉS :
  app/main.py              (charger_artefacts + lifespan + router)
  app/routers/monitoring.py (promote_model)
  app/services/pipeline_service.py (appliquer_flux_b + run_pipeline)
  app/routers/scoring.py   (réponse API + insertions MongoDB)
  requirements.txt         (vérification python-multipart)

NON TOUCHÉS (dans cette session) :
  app/routers/auth.py
  app/routers/clients.py
  app/routers/decisions.py
  app/routers/dashboard.py
  app/routers/admin.py
  app/db/mongodb.py
  app/db/collections.py
  app/core/security.py
  app/core/config.py
  app/services/shap_service.py
  app/services/psi_service.py
  app/services/percentile_service.py
  app/services/pdo_service.py
  Frontend Next.js (session ultérieure)

================================================================
## PRÉREQUIS AVANT DE DÉMARRER
================================================================

[ ] Copier les 9 artefacts dans ./artefacts/ du projet local :
    woe_transformers.pkl, nap_features.pkl, lgbm_final.pkl,
    iv_scores_final.csv, feature_stats.json,
    isolation_forest.pkl, scaler_if.pkl,
    encoder_if.pkl, if_metadata.json

[ ] Vérifier que le stack Docker tourne (api + mongodb)

[ ] Avoir un token ADMIN valide pour les tests

[ ] python-multipart présent dans requirements.txt
    (sinon : pip install python-multipart + ajouter au fichier)

================================================================
## ÉTAT CIBLE APRÈS CETTE SESSION
================================================================

✓ Upload d'artefacts via API HTTP (fini l'accès SSH)
✓ Versioning réel : promote = vrais fichiers GridFS chargés en RAM
✓ Rollback fonctionnel en une commande
✓ Restart automatique sur le bon modèle
✓ IF intégré dans le pipeline de scoring
✓ Règle d'escalade ACCORDÉ → REVUE si profil anormal
✓ Champs IF dans réponse API et MongoDB
✓ 0 régression sur les 20 endpoints validés session 5
✓ Frontend : session ultérieure