# HANDOVER pour CLAUDE CODE — CREDIX, Phase 2 (place des filtres)
## À lire EN ENTIER avant de toucher au notebook

> **Auteur du projet.** Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY / IT Nearshore.
> **Soutenance :** début septembre 2026.
> **Ton rôle (Claude Code).** Préparer le TERRAIN de la Phase 2 dans le notebook Kaggle dupliqué
> `credix-v3-quantification-2026-07.ipynb` : écrire les nouvelles cellules (Section 12.3+), testées
> en local sur données factices, PRÊTES à exécuter. **Tu n'exécutes PAS le notebook** (il tourne sur
> Kaggle avec les vraies données) : tu livres le code, l'auteur l'exécute et renvoie les sorties.

---

## 1. Ce qu'est CREDIX (contexte minimal indispensable)

Application IA de **scoring de risque de crédit** (personnes physiques), dataset **Home Credit
Default Risk** (proxy académique, 307 511 obs., défaut ~8 %). Architecture à **2 flux** :
- **Flux A (scoring supervisé)** : feature engineering → **filtre IV** (univarié) → **WOE** (encodage
  log-cote) → **NAP** (sélection multivariée) → **LightGBM** (+ scale_pos_weight) → calibration
  **isotonique** → **score PDO** + indice **ρc** + SHAP.
- **Flux B (garde-fou non supervisé)** : autoencodeur qui détecte les profils atypiques. Hors sujet
  pour la Phase 2.

**Fil directeur du mémoire :** *« chaque bloc du pipeline sert un objectif précis — on le prouve. »*

---

## 2. Règles ABSOLUES (non négociables)

1. **ON ÉTEND, ON NE SUPPRIME PAS.** Les Sections 0→11 du notebook sont validées et FIGÉES. Tu n'y
   touches JAMAIS. Idem pour les cellules déjà en Section 12 (12.0a, 12.0b, 12.1, 12.2). Toutes tes
   nouvelles cellules vont dans une **Section 12.3 et suivantes**, APRÈS l'existant.
2. **Repérage des cellules par EN-TÊTE** (commentaire de titre), jamais par numéro (Kaggle n'en a pas).
3. **Tu n'exécutes pas le notebook.** Tu testes ta LOGIQUE en local sur données factices, puis tu
   livres le code. L'auteur exécute sur Kaggle et renvoie les sorties.
4. **Décisions figées à respecter :** pipeline unique + LightGBM ; WOE avant NAP ; WOE gère les NaN
   par un bin « Manquant » (jamais d'imputation arbitraire) ; SMOTE jamais ; split temporel 70/15/15 ;
   personnes physiques ; métriques principales AUC/Gini/KS/Recall/F1 (jamais l'accuracy comme
   principale).
5. **Aucun chiffre inventé.** Le code produit les chiffres ; on ne les anticipe jamais dans les
   commentaires ou les rapports.
6. **Anti-fuite :** tout ce qui s'apprend (filtres, encodages) s'apprend sur le **TRAIN uniquement**,
   puis s'applique à val/test. Le test ne sert qu'à la mesure finale.

---

## 3. Où en est le projet (ne pas refaire)

- **Phase 0** validée : métriques de référence canoniques (run v3, test) = AUC **0,7510** / Gini
  0,5020 / KS 0,3732 / Recall 0,7185 / F1 0,2992. Jeu 2 des seuils de décision figé.
- **BK.1** (calibration isotonique) et **BK.2** (LightGBM ≈ XGBoost) : faits.
- **Tâche 6** (autoencodeur réducteur) : testée, écartée.
- **Phase 1** close cette session :
  - **1.1 ρc par tranche** : AUC monotone croissante avec ρc (0,7322 → 0,7530 → 0,7650) = preuve de ρc.
  - **1.2 Flux B intégré** : angle mort documenté sur les dossiers incomplets (effet médiane).
- Artefacts backend sauvegardés (cellules 12.0a/b) : `lgbm_final.pkl`, `isotonic_calibrator.pkl`,
  `decision_config.json`, + Flux B complet.

---

## 4. Ce qui reste = Phase 2 (TON TRAVAIL) — la PLACE des filtres

**⚠️ Recadrage capital.** L'ancienne « ablation V0→V6 » est **ABANDONNÉE** (redondante : WOE,
scale_pos_weight, isotonic sont déjà prouvés). La Phase 2 ne fait PAS un concours d'outils. Elle
démontre que **deux fonctions de filtrage ont chacune une place et un objectif distincts** dans le
pipeline, et que ce rôle est **robuste au choix de l'outil**.

**Les deux objectifs à démontrer :**
- **Filtre univarié (IV)** → objectif **PARCIMONIE / AUDITABILITÉ** : élimine tôt le bruit évident
  (variables sans signal *seules*). Ne regarde jamais les relations entre variables.
- **Filtre multivarié (NAP)** → objectif **STABILITÉ / ANTI-REDONDANCE** : traque la redondance qu'un
  critère univarié ne peut pas voir. Complémentaire, pas concurrent.

**Méthode imposée = OPTION 1 (comparaison légère).** Pour chaque test : comparer *quelles variables*
chaque filtre sélectionne (nombre, recoupement) + l'AUC test du modèle final. **PAS** de re-réglage
complet des hyperparamètres par variante. **Petite modularisation** : brancher UNE alternative à UN
endroit précis, tout le reste du pipeline reste intact et réutilisé.

Le détail exact des cellules à écrire est dans le **PROMPT_CLAUDE_CODE_PHASE2.md** (document joint).

---

## 5. Variables & artefacts disponibles dans le notebook (pour brancher ton code)

Ces objets existent déjà quand le notebook a tourné jusqu'à la Section 12 (kernel chaud). Fichiers sur
disque dans `/kaggle/working/` :

**Répertoires :** `DATA_DIR = '/kaggle/working/data/'`, `ART_DIR = '/kaggle/working/artefacts/'`,
`OUTPUT_DIR = '/kaggle/working/'`.

**Données (CSV) :**
- `X_train_iv.csv`, `X_val_iv.csv`, `X_test_iv.csv` — données **après filtre IV, AVANT WOE** (vrais
  NaN présents). Colonnes = les features retenues par l'IV.
- `X_train_woe.csv`, `X_val_woe.csv`, `X_test_woe.csv` — après WOE (plus de NaN).
- `X_train_nap.csv`, `X_val_nap.csv`, `X_test_nap.csv` — après WOE **et** sélection NAP (27 features
  finales) = l'entrée réelle de LightGBM.
- `y_train.csv`, `y_val.csv`, `y_test.csv` — labels (colonne TARGET, 0/1). Charger avec `.squeeze()`.

**Artefacts :**
- `iv_scores_final.csv` — colonnes `['feature','iv','dtype','decision']`. `decision ∈ {retained,
  rejected}`. Source de vérité des IV.
- `nap_features.pkl` — liste Python des 27 features finales (`features_nap`).
- `lgbm_final.pkl` — modèle LightGBM entraîné (avec scale_pos_weight). `predict_proba(X)[:,1]`.
- `isotonic_calibrator.pkl` — objet IsotonicRegression (calibration des probas).

**Objets Python en mémoire (kernel chaud) :** `features_nap` (liste 27), `features_iv` (liste après
IV), `X_train`, `X_val`, `X_test` (features engineered brutes), `y_train`, `y_val`, `y_test`,
`IV_THRESHOLD = 0.02`, `SCALE_POS_WEIGHT`, `COLORS` (dict couleurs figures), `lgbm_final`.

**Comment le filtre IV a construit sa sélection (Section 4, cellule à en-tête
`# SECTION 4 — PRE-FILTRE PAR INFORMATION VALUE`) :** pour chaque colonne, un OptimalBinning est
fitté sur le train, l'IV est calculé, `retained` si `iv >= IV_THRESHOLD (0.02)`. Résultat dans
`features_iv` et `iv_scores_final.csv`. C'est CE point que la Phase 2.1 doit dupliquer avec MI.

**Comment NAP a sélectionné (Section 6, en-tête `# SECTION 6 — SELECTION NAP`) :** importance de
permutation sur tout le train ; features avec `importance > 0` gardées. Ici NAP a **tout gardé
(27/27)** → rôle confirmatoire. C'est CE point que la Phase 2.2 compare à une sélection VIF.

---

## 6. Environnement Kaggle (pièges connus)

- Image Kaggle : Python 3.12, LightGBM 4.6, scikit-learn récent. `mutual_info_classif` et
  `variance_inflation_factor` (statsmodels) sont disponibles ; si statsmodels manque, calculer le VIF
  à la main (1/(1-R²) par régression OLS de chaque feature sur les autres).
- Si erreur d'import protobuf/TensorFlow : `!pip install -q -U "protobuf>=4.26"` puis Restart. (Sans
  objet pour la Phase 2 qui ne touche pas TensorFlow, mais à savoir.)
- Graine unique = 42 partout (reproductibilité).

---

## 7. Livrable attendu de toi (Claude Code)

1. Les **nouvelles cellules** (Section 12.3, 12.4, …) prêtes à coller, chacune avec un **en-tête clair**.
2. Chaque cellule **testée en local sur données factices** (tu écris un petit script de test à part,
   tu montres qu'il tourne sans erreur, tu ne l'inclus pas dans le notebook).
3. Un court **récapitulatif** : quelles cellules, dans quel ordre, ce que l'auteur doit exécuter, quels
   « flags/actifs » il doit régler s'il y a lieu, et quelles sorties renvoyer.
4. **Aucune modification** des Sections 0→11 ni des cellules 12.0/12.1/12.2.

L'auteur exécutera sur Kaggle et renverra les sorties à l'assistant principal (chat) pour validation
AVANT toute consignation dans les rapports.
