# TODO — Versioning des Artefacts ML (Upload + GridFS)
# Singhe Penka Hendrix Donavan — 21P050 — GI2026
# Créé : 25 juin 2026

================================================================
## CONTEXTE ET PROBLÈME IDENTIFIÉ
================================================================

### Situation actuelle (avant cette tâche)

Le backend charge ses artefacts ML depuis un dossier fixe sur le disque :

    scoring-backend/artefacts/
      woe_transformers.pkl      ← transformations WOE (OptimalBinning)
      nap_features.pkl          ← liste ordonnée des 27 features NAP
      lgbm_final.pkl            ← modèle LightGBM entraîné
      iv_scores_final.csv       ← scores IV par feature
      feature_stats.json        ← statistiques descriptives des features

Ces fichiers ont été copiés manuellement sur le serveur après entraînement
sur Kaggle. Il n'existe aucun endpoint d'upload, aucune gestion de versions.

### Conséquence concrète

- Le data scientist doit avoir accès SSH/docker au serveur pour déposer
  ses fichiers (scp, docker cp) → inadmissible en production
- La promotion de modèle (POST /api/monitoring/promote-model) change
  un statut dans MongoDB mais recharge TOUJOURS le même dossier fixe,
  peu importe le run_id promu → le versioning affiché est fictif
- Il est impossible de comparer ou de rollback vers une version précédente

================================================================
## DÉCISIONS ARCHITECTURALES — POURQUOI GRIDFS
================================================================

### Option A — MLflow (éliminée)

MLflow est déjà dans docker-compose.yml mais n'est utilisé nulle part
dans le code Python. L'intégration aurait demandé :
  - Exposer le serveur MLflow publiquement (ou tunnel) pour que Kaggle
    puisse y pousser les artefacts directement via mlflow.log_artifact()
  - En contexte académique avec proxy réseau, cette exposition est
    difficile voire impossible sans infrastructure dédiée
  - Ajouter une dépendance Python mlflow au container API
  - Refactoriser charger_artefacts() pour appeler
    mlflow.artifacts.download_artifacts(run_id=...)

Verdict : surcoût d'infrastructure non justifié pour le périmètre PFE.
MLflow reste mentionné comme perspective en production réelle.

### Option B — Dossiers versionnés sur le disque (éliminée)

Créer artefacts/{run_id}/ pour chaque version. Simple mais :
  - Toujours besoin d'un accès disque direct pour déposer les fichiers
  - Pas de gestion des métadonnées associées à chaque artefact
  - Accumulation de fichiers sans nettoyage automatique
  - Ne résout pas le problème d'upload depuis Kaggle

Verdict : ne résout pas le problème racine (accès disque manuel).

### Option C — MongoDB GridFS (RETENUE)

GridFS est le système de stockage de fichiers binaires intégré à MongoDB,
déjà présent dans l'infrastructure (pas de nouveau conteneur).

Avantages :
  - Le data scientist uploade ses fichiers via un endpoint HTTP standard
    depuis n'importe où (Kaggle, laptop, CI/CD)
  - Chaque upload génère un run_id → entrée STAGING dans col_modeles
  - L'admin promeut le run_id voulu → les bons fichiers sont chargés en RAM
  - Rollback = promouvoir un ancien run_id (les fichiers sont toujours en GridFS)
  - Compatible avec l'ajout futur d'autres types d'artefacts
    (ex : modèle Isolation Forest pour détection zero-day)
  - Zéro nouvelle dépendance infrastructure

================================================================
## ARCHITECTURE CIBLE
================================================================

### Flux complet (data scientist → production)

    [Kaggle / Notebook]
      entraîner le modèle
      exporter les fichiers :
        woe_transformers.pkl, nap_features.pkl, lgbm_final.pkl,
        iv_scores_final.csv, feature_stats.json
        [futur] isolation_forest.pkl  ← détection zero-day

    [Data Scientist → API]
      POST /api/admin/upload-model
        multipart/form-data :
          - chaque fichier artefact dans son champ nommé
          - métadonnées : nom_version, description, metriques (JSON)
        → backend stocke chaque fichier dans GridFS
        → génère un run_id unique (UUID)
        → insère dans col_modeles { run_id, statut: "STAGING", ... }
        → retourne { run_id, statut: "STAGING" }

    [Admin → UI Gestion des modèles]
      GET /api/monitoring/model-versions
        → liste les versions STAGING / PRODUCTION / ARCHIVE
        → l'admin voit les métriques et choisit laquelle promouvoir

      POST /api/monitoring/promote-model { run_id }
        → récupère les fichiers depuis GridFS par run_id
        → écrit temporairement dans artefacts/{run_id}/
        → charge en RAM via charger_artefacts(app, run_id)
        → supprime les fichiers temporaires après chargement
        → met à jour MongoDB : run_id → PRODUCTION, ancien → ARCHIVE

    [API en production]
      state.lgbm_model, state.woe_transformers, etc.
      → les artefacts de la version promue sont actifs en RAM

### Démarrage à froid (premier lancement / restart)

    Le dossier ./artefacts/ reste le seed initial.
    Au démarrage, charger_artefacts() vérifie :
      1. Y a-t-il un modèle PRODUCTION dans col_modeles avec fichiers GridFS ?
         → Oui : charge depuis GridFS (version promue)
         → Non : charge depuis ./artefacts/ (seed initial, fallback)

================================================================
## FICHIERS À MODIFIER / CRÉER
================================================================

### Nouveaux fichiers

[ ] app/routers/upload_model.py
    Endpoint POST /api/admin/upload-model
    - Accepte multipart/form-data avec les champs nommés des artefacts
    - Valide que les fichiers obligatoires sont présents
    - Stocke dans GridFS via motor (asyncio-compatible)
    - Génère run_id = str(uuid.uuid4())
    - Insère dans col_modeles
    - Retourne { run_id, statut, fichiers_reçus }
    - Rôle requis : ADMIN

[ ] app/db/gridfs.py
    Utilitaires GridFS :
    - get_gridfs_bucket()  → moteur GridFS async (motor.AsyncIOMotorGridFSBucket)
    - sauvegarder_artefact(run_id, nom_fichier, contenu_bytes)
    - telecharger_artefact(run_id, nom_fichier) → bytes
    - lister_artefacts(run_id) → liste des noms de fichiers
    - supprimer_artefacts(run_id) → nettoyage si version rejetée

### Fichiers à modifier

[ ] app/main.py — charger_artefacts(app, run_id=None)
    AVANT : lit toujours depuis {artefacts_dir}/{nom_fichier}
    APRÈS :
      si run_id fourni ET fichiers présents dans GridFS :
        → télécharger depuis GridFS vers /tmp/artefacts/{run_id}/
        → charger avec joblib/pd.read_csv
        → nettoyer /tmp/ après chargement
      sinon :
        → fallback sur ./artefacts/ (seed initial)

[ ] app/routers/monitoring.py — promote_model()
    AVANT : appelle charger_artefacts(app) sans run_id
    APRÈS : appelle charger_artefacts(app, run_id=body.run_id)

[ ] app/main.py — lifespan()
    Au démarrage, chercher le modèle PRODUCTION dans col_modeles
    et passer son run_id à charger_artefacts si GridFS disponible.

[ ] app/main.py — inclure le nouveau router upload_model

[ ] app/db/collections.py
    Vérifier que col_modeles() est bien exporté (déjà le cas).

================================================================
## LISTE DES ARTEFACTS GÉRÉS (extensible)
================================================================

Le système doit être conçu pour accepter une liste ouverte de fichiers.
Ne pas coder en dur les noms — utiliser une liste de configuration.

### Artefacts actuels (scoring crédit LightGBM)

  Nom du champ multipart    Fichier attendu              Obligatoire
  ─────────────────────────────────────────────────────────────────
  woe_transformers          woe_transformers.pkl         OUI
  nap_features              nap_features.pkl             OUI
  lgbm_model                lgbm_final.pkl               OUI
  iv_scores                 iv_scores_final.csv          OUI
  feature_stats             feature_stats.json           OUI

### Artefacts futurs prévus (détection zero-day — Isolation Forest)

  Nom du champ multipart    Fichier attendu              Obligatoire
  ─────────────────────────────────────────────────────────────────
  isolation_forest          isolation_forest.pkl         NON (optionnel)
  if_threshold              if_threshold.json            NON (optionnel)

  → Ces fichiers seront uploadés en même temps que les artefacts de scoring
    ou dans un upload séparé rattaché au même run_id.
  → charger_artefacts() les chargera si présents dans GridFS,
    les ignorera silencieusement si absents (compatibilité ascendante).

================================================================
## SCHÉMA MONGODB — col_modeles (version enrichie)
================================================================

{
  run_id           : "uuid-généré-à-l-upload",   // clé primaire logique
  nom_version      : "lgbm-v2-juin2026",          // label lisible
  description      : "Re-entraîné sur 120k obs, AUC 0.79",
  statut           : "STAGING",                   // STAGING / PRODUCTION / ARCHIVE
  date_upload      : ISODate,
  uploaded_by      : "user_id de l'admin",
  date_entrainement: ISODate,                      // optionnel, saisi par le DS
  promoted_at      : ISODate,                      // rempli lors de la promotion
  promoted_by      : "user_id de l'admin",
  metriques        : {                             // JSON libre fourni à l'upload
    auc_roc        : 0.79,
    gini           : 0.58,
    ks_stat        : 0.42,
    nb_observations: 120000
  },
  fichiers_gridfs  : [                             // liste des fichiers stockés
    "woe_transformers.pkl",
    "nap_features.pkl",
    "lgbm_final.pkl",
    "iv_scores_final.csv",
    "feature_stats.json"
  ]
}

================================================================
## ORDRE D'IMPLÉMENTATION
================================================================

[ ] Étape 1 — app/db/gridfs.py
    Créer les utilitaires GridFS async.
    Tester unitairement : sauvegarder → télécharger → supprimer.

[ ] Étape 2 — app/routers/upload_model.py
    Créer l'endpoint POST /api/admin/upload-model.
    Tester avec curl multipart depuis le terminal local.

[ ] Étape 3 — app/main.py (charger_artefacts)
    Ajouter la logique GridFS avec fallback ./artefacts/.
    Tester : upload → promote → vérifier que les fichiers GridFS
    sont bien chargés en RAM (GET /health pour confirmer).

[ ] Étape 4 — app/routers/monitoring.py (promote_model)
    Passer run_id à charger_artefacts().

[ ] Étape 5 — app/main.py (lifespan)
    Au démarrage, chercher le modèle PRODUCTION et charger depuis GridFS.

[ ] Étape 6 — Tests end-to-end
    Flux complet : upload → GET model-versions → promote → GET /health
    Vérifier PSI et audit logs sur le bon run_id.

[ ] Étape 7 — Documentation mémoire
    Section "Versioning des modèles" : expliquer le choix GridFS vs MLflow
    et le flux data scientist → admin → production.

================================================================
## DÉCISIONS FIGÉES POUR CETTE TÂCHE
================================================================

- GridFS bucket name : "artefacts_ml" (séparé du reste de MongoDB)
- run_id = UUID v4 généré par le backend à l'upload (pas par le DS)
- Le dossier ./artefacts/ reste le seed initial, jamais supprimé
- /tmp/artefacts/{run_id}/ est nettoyé après chargement en RAM
- Les fichiers optionnels (IF) ne bloquent pas la promotion si absents
- Rollback = POST /api/monitoring/promote-model avec un ancien run_id
  (les fichiers GridFS ne sont jamais supprimés automatiquement)
- Un seul modèle PRODUCTION à la fois (comportement déjà en place)

================================================================
## PRÉREQUIS TECHNIQUES
================================================================

- motor (déjà dans requirements.txt — client MongoDB async)
  → motor.motor_asyncio.AsyncIOMotorGridFSBucket disponible nativement
- python-multipart (à vérifier dans requirements.txt)
  → nécessaire pour FastAPI UploadFile / multipart

================================================================
