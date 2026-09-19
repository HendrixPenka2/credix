# Rapport de vérification empirique — Indice de couverture informationnelle ρc

**Périmètre.** Vérification empirique du mécanisme ρc du projet CREDIX : arithmétique
des seuils (Test 1), ablation contrôlée sur clients réels (Test 2), déclenchement réel
des actions dans le backend (Test 3), parcours applicatif complet (Test 4).

**Règle appliquée.** Toutes les valeurs ci-dessous sont celles réellement obtenues par
exécution du code réel du projet (aucun recalcul manuel substitué à un résultat de
script), sans arrondi favorable à l'hypothèse. Les seuils P95/P99 du Flux B sont
chargés tels quels depuis `ae_metadata.json`, jamais recalculés. ρc et le score
d'atypicité ne sont évalués nulle part contre `TARGET`.

**Méthode d'exécution.** Un script (`app/services/rho_service.calculer_rho`,
`app/services/pdo_service.get_decision`, `app/services/pipeline_service.appliquer_flux_b`,
etc., importés tels quels, aucune réécriture de la logique métier) a été exécuté dans
le conteneur `scoring-api` déjà en service (healthy, artefacts ML chargés dont
l'autoencodeur). Les 1000 clients réels du Test 2 proviennent de `application_test.csv`
(jeu Home Credit officiellement tenu à l'écart de l'entraînement, sans colonne
`TARGET`), matérialisés via `HomeCreditAdapter` — même logique que
`scripts/seed_database.py` en production. **Substitution à noter** : ce n'est pas le
split interne 70/15/15 du notebook (`test_df`, 46 128 lignes) — celui-ci n'a jamais été
matérialisé sur disque (chemin Kaggle éphémère, absent du repo). `application_test.csv`
satisfait néanmoins strictement la contrainte « jamais utilisé à l'entraînement ».

---

## ⚠️ ADDENDUM — `rho_seuil_banniere` relevé de 0,40 à 0,42 après ce rapport

Après la rédaction initiale de ce rapport, `rho_seuil_banniere` a été modifié dans
`app/core/config.py`/`.env` (0,40 → **0,42**), directement motivé par la constatation du
Test 1(d)/Test 4 ci-dessous (un dossier ne manquant que de la catégorie C a ρc=0,4163,
donc ≥0,40 : la bannière ne se déclenchait pas alors que c'est justement le cas qu'elle
est censée couvrir). `rho_seuil_revue_forcee` **n'a pas changé** (toujours 0,25).
Le conteneur a été redémarré et **les tests ont été rejoués avec les valeurs réellement
actives** (vérifié : `settings.rho_seuil_banniere == 0.42` dans le process en cours).

**Le mécanisme continue de fonctionner correctement avec le nouveau seuil** — la
cohérence stricte (bannière déclenchée si et seulement si ρc < seuil configuré, quel
qu'il soit) reste vérifiée sur les 4000 profils. Ce qui change, ce sont uniquement les
populations concernées :

| Version | % bannière à 0,40 (rapport initial) | % bannière à 0,42 (rejoué) |
|---|---:|---:|
| V0 | 0,0 % | 0,0 % *(inchangé — min réel 0,4864, toujours au-dessus)* |
| V1 (C→NaN) | 32,2 % | **100,0 %** *(le plafond théorique de V1, 0,4163, est maintenant sous 0,42 — TOUS les clients ayant perdu uniquement la catégorie C déclenchent désormais la bannière)* |
| V2 (C+B→NaN) | 100,0 % | 100,0 % *(inchangé — plafond 0,1008, déjà bien en dessous)* |
| V3 (50 % aléatoire) | 24,9 % | 30,9 % |

Revue forcée et Flux B (liés à 0,25, inchangé) donnent des chiffres **strictement
identiques** au rapport initial (0,0 % / 100,0 % / 0,9 % selon la version), et la
cohérence revue-forcée = Flux-B-désactivé reste vraie à 100 % dans les 4 versions.

**Test 4 rejoué sur le même client réel** (`CLT-20260821-DD5B4094`, ρc=0,4163,
inchangé — c'est une propriété du dossier, pas du seuil) :

| | Avant (seuil 0,40) | Après (seuil 0,42) |
|---|---|---|
| `recommandation_rho.afficher` | `false` | **`true`** |
| `niveau_urgence` | — | `ATTENTION` |
| Message | — | « Confiance limitée — ce score repose principalement sur les données déclaratives » |
| Documents recommandés | — | EXT_SOURCE_3 (+15,2 %), EXT_SOURCE_2 (+14,6 %), EXT_SOURCE_1 (+6,6 %), prev_refused_ratio (+3,3 %), bureau_active_count (+2,8 %) — `rho_potentiel_max: "78%"` |
| `rho_c`, `decision`, `score_pdo` | 0,4163 / REVUE_MANUELLE / 571 | **inchangés** (ne dépendent pas de ce seuil) |

**Conclusion sur ce changement** : le correctif atteint exactement l'effet recherché
sur le cas qui a motivé le changement (Test 4), et le mécanisme reste cohérent
partout ailleurs. Point de vigilance à noter pour le mémoire : ce nouveau seuil 0,42
n'est **toujours pas** dérivé d'une distribution mesurée — c'est un ajustement réactif
au cas particulier « C manquant, rien d'autre » (0,4163), pas une recalibration
générale. Le seuil 0,25, lui, n'a pas été retouché et reste discuté tel quel dans le
Test 1(d) original ci-dessous (rho_seuil_banniere y est donc mentionné à 0,40 — valeur
active au moment de ce calcul initial, cf. addendum ci-dessus pour les chiffres à jour).

---

## TEST 1 — Arithmétique des seuils

### Deux gouvernances A/B/C coexistent dans le projet — les deux sont testées

Le code exécute réellement une classification par **fréquence de collecte**
(« Catégorie A/B/C », nommée ainsi dans `pipeline_service.py::assembler_vecteur` et
`scoring.py::GET /form-schema`, flags `is_declarative`/`is_request_specific` de
`feature_stats.json`) — appelée ci-dessous **classification 1**. Le chapitre 2 du
mémoire raisonne, lui, en **droits de modification** (`FEATURES_C` /
`CHAMPS_IMMUABLES` de `app/routers/clients.py`) — **classification 2**, reconstruite
depuis le code pour cette vérification. Les deux s'accordent exactement sur la
catégorie C (13 features identiques) mais divergent sur le partage A/B des 14 autres.

### (a) Les 27 features NAP — IV et catégorie dans chaque classification

| Feature | IV | Classif. 1 (fréquence de collecte) | Classif. 2 (droits de modification) |
|---|---:|:---:|:---:|
| EXT_SOURCE_3 | 0.321622 | C | C |
| EXT_SOURCE_2 | 0.308047 | C | C |
| EXT_SOURCE_1 | 0.140300 | C | C |
| annuity_to_credit | 0.112765 | A | A |
| employment_years | 0.107893 | B | B |
| OCCUPATION_TYPE | 0.087963 | B | B |
| age_years | 0.084983 | B | **A** |
| goods_to_credit | 0.079153 | A | A |
| ORGANIZATION_TYPE | 0.073463 | B | B |
| prev_refused_ratio | 0.070313 | C | C |
| NAME_INCOME_TYPE | 0.060736 | B | B |
| bureau_active_count | 0.059878 | C | C |
| avg_payment_ratio | 0.058344 | C | C |
| avg_payment_diff | 0.052340 | C | C |
| CODE_GENDER_bin | 0.050468 | B | **A** |
| CODE_GENDER | 0.050468 | B | **A** |
| REGION_RATING_CLIENT | 0.050320 | B | **A** |
| NAME_EDUCATION_TYPE | 0.047214 | B | B |
| bureau_debt_total | 0.046890 | C | C |
| std_payment_ratio | 0.042316 | C | C |
| inst_ever_late | 0.041328 | C | C |
| history_length_days | 0.036090 | C | C |
| prev_avg_down_payment | 0.033011 | C | C |
| registration_years | 0.028967 | B | B |
| EMERGENCYSTATE_MODE | 0.024675 | B | **A** |
| pos_avg_dpd_all | 0.023754 | C | C |
| NAME_CONTRACT_TYPE | 0.021183 | A | A |

IV = valeur réellement utilisée par `calculer_rho()` en production (dernière
occurrence du CSV, cf. note ci-dessous).

**Note — anomalie de données `iv_scores_final.csv`** : ce fichier contient une ligne
dupliquée pour `EXT_SOURCE_1` (0.140251… puis 0.1403 en fin de fichier). Comme
`calculer_rho()` construit son dictionnaire IV via une dict-comprehension itérée dans
l'ordre du CSV, **la dernière occurrence écrase la première** : la production utilise
réellement IV=0.1403. Comparaison chiffrée des deux options :

| | Dernière occurrence (réf. code) | Première occurrence |
|---|---:|---:|
| IV_total | 2.114486 | 2.114437 |
| Écart absolu | — | 0.0000489 |
| Écart relatif | — | 0.0023 % |
| ρc(C manquant) résultant | 0.41630 | 0.41631 |

**Conclusion sur cette anomalie : l'écart est négligeable (0,0023 % de l'IV totale,
5ᵉ décimale de ρc) — il ne change ni les parts par catégorie, ni les ρc théoriques
arrondis à 4 décimales, ni aucun franchissement de seuil.** La suite du rapport utilise
la valeur réellement exécutée par le code (dernière occurrence, IV_total = 2,114486).

### (b) Répartition de l'IV par catégorie

**Classification 1 (fréquence de collecte — celle exécutée par le pipeline) :**

| Catégorie | nb features | somme IV | part de l'IV totale |
|---|---:|---:|---:|
| A | 3 | 0,213102 | 10,08 % |
| B | 11 | 0,667150 | 31,55 % |
| C | 13 | 1,234234 | 58,37 % |
| **Total** | **27** | **2,114486** | **100,00 %** |

**Classification 2 (droits de modification — celle du chapitre 2 du mémoire) :**

| Catégorie | nb features | somme IV | part de l'IV totale |
|---|---:|---:|---:|
| A | 8 | 0,474015 | 22,42 % |
| B | 6 | 0,406237 | 19,21 % |
| C | 13 | 1,234234 | 58,37 % |
| **Total** | **27** | **2,114486** | **100,00 %** |

(Les deux triplets totalisent bien 100,00 % — vérifié.)

### (c) ρc théoriques dérivés

| Scénario | Classification 1 | Classification 2 |
|---|---:|---:|
| ρc si **C** manque entièrement | **0,4163** | **0,4163** *(identique — C est commune aux deux)* |
| ρc si **B et C** manquent (seul A présent) | **0,1008** | **0,2242** |

### (d) Conclusion — confirmé ou à corriger ?

**Le franchissement de seuil, vérifié explicitement :**

| Scénario | ρc théorique | vs seuil bannière 0,40 | vs seuil revue forcée / Flux B 0,25 |
|---|---:|---|---|
| C manque (les deux classif.) | 0,4163 | **≥ 0,40 → bannière NON déclenchée** | ≥ 0,25 → Flux B actif |
| B+C manquent, classif. 1 | 0,1008 | < 0,40 → bannière déclenchée | **< 0,25, marge large (−0,1492) → revue forcée + Flux B off** |
| B+C manquent, classif. 2 | 0,2242 | < 0,40 → bannière déclenchée | **< 0,25, marge étroite (−0,0258) → revue forcée + Flux B off** |

**Comparaison à l'affirmation du chapitre 2 du mémoire** (« un dossier privé de toute la
catégorie C ne conserve plus qu'environ 40 % du signal, d'où le seuil 0,40 » ;
« privé de C et B, environ un quart, d'où 0,25 ») :

- **Affirmation « ≈40 % pour C manquant »** : **approximative mais optimiste** pour les
  deux classifications — la valeur réelle est 0,4163, soit *au-dessus* du seuil de
  0,40, pas en dessous. Un dossier qui perd exactement et uniquement la catégorie C
  garde en réalité *plus* de 40 % du signal (41,63 %) : **il ne déclencherait donc PAS
  la bannière documentaire au sens strict du code** — contrairement à l'intuition
  narrative du mémoire, qui présente 0,40 comme le seuil correspondant à ce scénario.
- **Affirmation « ≈25 % pour B+C manquants »** : **fausse pour la classification 1**
  (0,1008, moins de la moitié de 0,25 — la marge réelle est 2,5 fois plus large que
  prévu) ; **approximativement exacte pour la classification 2** (0,2242, à 2,6 points
  du seuil configuré).

**Conclusion explicite (RÈGLE ABSOLUE — infirmation à écrire en tête) : le
raisonnement narratif du mémoire pour le seuil 0,25 colle nettement mieux à la
classification 2 (droits de modification) qu'à la classification 1 (celle réellement
exécutée par `assembler_vecteur`/`pipeline_service.py` pour construire le vecteur de
features à chaque scoring).** Autrement dit, la gouvernance qui *justifie* narrativement
0,25 dans le mémoire n'est pas la même que celle qui *s'exécute* réellement dans le
pipeline. Ce n'est pas une contradiction fatale (les deux classifications s'accordent
sur ce qui compte le plus, la catégorie C à 58,37 % de l'IV), mais c'est une divergence
réelle à corriger ou à expliciter dans le mémoire : préciser explicitement laquelle des
deux gouvernances sous-tend chaque seuil, plutôt que de les présenter comme équivalentes.

Cette conclusion **corrobore** un constat déjà documenté dans le projet
(`RAPPORT_DECISIONS_METHODOLOGIQUES_CREDIX.md`, notebook Section 12.1) : les seuils
0,40/0,25 sont des choix métier fixés *a priori*, jamais calibrés sur une distribution
mesurée — le notebook lui-même a trouvé un ρc minimum empirique de 0,3918 sur 46 128
clients de test (contre 0,4163 théorique pour « C manquant » ici), confirmant qu'aucun
client réel n'a « exactement et uniquement » la catégorie C manquante — cf. Test 2.

---

## TEST 2 — Ablation contrôlée sur 1000 clients réels (`application_test.csv`)

Échantillon : `sample(n=1000, random_state=42)` sur les 48 744 `SK_ID_CURR` de
`application_test.csv`, matérialisé via `HomeCreditAdapter` (mêmes agrégats
bureau/POS/installments/previous_application qu'en production). V1/V2 utilisent
l'ablation de la **classification 1** (celle exécutée par le pipeline).

| Version | ρc min | ρc moyen | ρc médian | ρc max | % < 0,40 | % < 0,25 |
|---|---:|---:|---:|---:|---:|---:|
| V0 (intact) | 0,4864 | 0,9035 | 0,9336 | 1,0000 | 0,0 % | 0,0 % |
| V1 (C → NaN) | 0,2587 | 0,3875 | 0,4046 | 0,4163 | 32,2 % | 0,0 % |
| V2 (C+B → NaN) | 0,0475 | 0,1007 | 0,1008 | 0,1008 | 100,0 % | 100,0 % |
| V3 (50 % aléatoire) | 0,1577 | 0,4709 | 0,4682 | 0,7121 | 24,9 % | 0,9 % |

**Commentaire par écart à l'attendu :**

- **V0** : attendu « tous ≥ 0,39 et aucun sous les seuils » — **confirmé** (min réel
  0,4864, largement au-dessus, 0 % sous les deux seuils). Le minimum réel de cet
  échantillon (0,4864) est même supérieur au minimum trouvé par le notebook sur les
  46 128 clients du split interne (0,3918) et à celui du RAPPORT_DECISIONS sur un
  échantillon de validation (0,4722) — cohérent avec le fait que 1000 clients tirés
  au hasard ne couvrent pas nécessairement le cas le plus dégradé de toute la
  population, sans contredire ces résultats antérieurs.
- **V1** : attendu « très majoritairement sous 0,40, peu ou pas sous 0,25 ». **Partie
  infirmée** : seuls 32,2 % passent sous 0,40 — ce n'est pas « très majoritairement »
  (ce serait attendu si le plafond théorique 0,4163 se trouvait nettement au-dessus de
  0,40 pour la quasi-totalité des clients ; en réalité le plafond 0,4163 n'est que
  légèrement au-dessus de 0,40, donc une fraction seulement des clients — ceux ayant
  aussi une valeur naturellement manquante parmi les 14 features B+A restantes — passe
  sous la barre). La partie « peu ou pas sous 0,25 » est en revanche **confirmée**
  (0,0 %, aucun cas).
- **V2** : attendu « très majoritairement sous 0,25 » — **confirmé et dépassé** : 100 %
  des 1000 clients sont sous 0,25 (le plafond théorique de cette version, 0,1008, est
  déjà largement sous 0,25 — cf. Test 1(c) classification 1 — donc mécaniquement
  systématique, pas seulement majoritaire).
- **V3** : attendu « dispersion large » — **confirmé** (min 0,1577, max 0,7121,
  étendue de 0,55).

---

## TEST 3 — Déclenchement réel des actions (mêmes 4000 profils)

Score, décision (`pdo_service.get_decision`), bannière (`rho_service.generer_recommandation`)
et Flux B (autoencodeur réel, `pipeline_service.appliquer_flux_b`) calculés pour
chacun des 4000 profils.

| Version | % bannière documentaire | % revue forcée (branche ρc<0,25 déclenchée) | % Flux B désactivé |
|---|---:|---:|---:|
| V0 | 0,0 % | 0,0 % | 0,0 % |
| V1 | 32,2 % | 0,0 % | 0,0 % |
| V2 | 100,0 % | 100,0 % | 100,0 % |
| V3 | 24,9 % | 0,9 % | 0,9 % |

**Vérifications explicites demandées :**

1. **La bannière se déclenche-t-elle exactement sous 0,40 ?** Oui — dans les 4
   versions, `% bannière` est **identique au chiffre** à `% ρc<0,40` du Test 2 (32,2 %,
   100 %, 24,9 %, 0 %). Aucun écart, aucune approximation.
2. **La revue forcée exactement sous 0,25 ?** Oui — `% branche ρc<0,25 déclenchée` est
   **identique** à `% ρc<0,25` du Test 2 dans les 4 versions. **Nuance à signaler** :
   sur les 4000 profils, la branche thin-file (`rho_c < 0,25`) a **toujours** abouti à
   `REVUE_MANUELLE`, **jamais** à `REFUSE` direct (0,0 % dans les 4 versions) — le
   chemin « REFUSE direct » ajouté en Session 5 (score déjà mauvais + dossier vide)
   existe bien dans le code (`pdo_service.py` L.81-83) mais n'a été observé sur aucun
   des 4000 profils testés : soit ce sous-cas est rare sur ce jeu de données, soit
   aucun client suffisamment mauvais score n'a coïncidé avec un dossier sous 0,25 dans
   cet échantillon — à ne pas confondre avec un défaut du mécanisme.
3. **Le Flux B est-il désactivé sous 0,25, et seulement là ?** Oui, **exactement** —
   `% Flux B désactivé` est strictement égal à `% branche revue forcée déclenchée`
   dans les 4 versions (contrôle de cohérence automatique du script : vrai dans les 4
   cas). Aucune incohérence entre le seuil configuré (0,25) et le comportement observé.
4. **Points de bord** : aucun des 4000 profils n'a de ρc exactement égal à 0,40 ou à
   0,25 (vérifié explicitement) — les comparaisons strictes (`<`/`>=`) du code n'ont
   donc pas pu être testées sur un cas limite réel dans cet échantillon.

**Effet Flux B observé (au-delà de la simple activation/désactivation)** — donnée
intéressante non demandée explicitement mais découverte pendant l'exécution :

| Version | % anomalie détectée (Flux B actif) | % escalade ACCORDÉ→REVUE_MANUELLE |
|---|---:|---:|
| V0 | 5,8 % | 4,6 % |
| V1 | 0,8 % | 0,8 % |
| V2 | — (désactivé) | — |
| V3 | 51,4 % (≈51,9 % des profils réellement évalués, 0,9 % étant désactivés) | 36,3 % |

Ce résultat **corrobore directement** la justification donnée dans le code pour
désactiver le Flux B sous 0,25 (« features imputées en masse → faux positifs
systématiques ») : le taux d'anomalie détectée bondit de 5,8 % (V0, données réelles) à
51,4 % (V3, 50 % de valeurs imputées au hasard) — près de 9 fois plus élevé — ce qui
aurait produit une escalade massive et largement artificielle si le Flux B n'était pas
coupé sur les dossiers les plus dégradés.

---

## TEST 4 — Parcours applicatif « nouveau client »

Client créé via `POST /api/clients` avec uniquement les champs du formulaire de
création (catégorie B) : `date_naissance`, `genre`, `niveau_education`, `type_emploi`,
`type_revenu`, `anciennete_emploi_mois`, `anciennete_domicile_mois`,
`ORGANIZATION_TYPE`, `REGION_RATING_CLIENT`, `EMERGENCYSTATE_MODE` → `client_id`
`CLT-20260821-DD5B4094` (catégorie C forcée à `None` automatiquement par l'endpoint,
aucune donnée bureau injectée manuellement). Puis `POST /api/scoring/predict` avec le
`declaratif` (catégorie A) : `type_contrat="Cash loans"`, `montant_annuite=25000`,
`montant_credit_demande=500000`, `valeur_bien=500000`.

**Réponse brute (verbatim) :**

```json
{
  "rho_c": 0.4163,
  "decision": "REVUE_MANUELLE",
  "score_pdo": 571,
  "pd_c": 0.125479,
  "recommandation_rho": { "afficher": false },
  "anomaly_score": 0.03224,
  "is_anomaly": false,
  "if_escalade": false,
  "if_seuil": 0.1774529367685318,
  "if_detecteur": "autoencoder",
  "if_percentile": 95,
  "decision_initiale": null
}
```

**Comparaison à la valeur théorique du Test 1(c)** (« ρc si C manque », scénario
identique : A+B présents, C absent) :

| | Théorique (Test 1) | Observé (Test 4, API réelle) | Écart |
|---|---:|---:|---:|
| ρc | 0,4163 | **0,4163** | **0** |

**Correspondance exacte, à la 4ᵉ décimale.** Aucun écart à expliquer : un nouveau
client renseigné avec l'intégralité du formulaire réel (catégorie B à la création +
catégorie A au scoring) reproduit très précisément le scénario théorique « catégorie C
entièrement absente » du Test 1, ce qui valide à la fois le calcul manuel du Test 1 et
le comportement réellement exécuté par l'API.

**Conséquences observées, cohérentes avec le Test 1(d)** : bannière **non affichée**
(`afficher: false`, car ρc=0,4163 ≥ 0,40 — confirme que perdre uniquement la catégorie
C ne déclenche pas la bannière documentaire, contrairement à l'intuition narrative du
mémoire) ; décision **REVUE_MANUELLE** via la branche normale (score 571, entre les
seuils REFUSE 539,5 et ACCORDÉ 578,5 — pas la branche thin-file, puisque ρc ≥ 0,25) ;
Flux B **actif** (`if_detecteur: "autoencoder"`, `if_seuil` = 0,177453, exactement la
valeur P95 de `ae_metadata.json`), pas d'anomalie détectée sur ce profil précis.

⚠️ Cette étape a créé un client de test persistant (`CLT-20260821-DD5B4094`) dans le
MongoDB de développement actuellement en service (qui contenait déjà 501 clients de
test issus du seeding Home Credit) — suppression possible sur demande.

---

## Section additionnelle — Seuils alternatifs (purement informative)

Aucune modification de `config.py` ni d'aucun autre fichier de code. Seuils candidats
dérivés du Test 1(c), appliqués de façon purement informative aux ρc déjà calculés au
Test 2 (mêmes 4000 profils, aucun nouveau calcul d'ablation) :

- **Candidat "C manquant"** (commun aux deux classifications) : **0,4163**
- **Candidat "B+C manquants", classification 1** : **0,1008**
- **Candidat "B+C manquants", classification 2** : **0,2242**

| Version | % < seuil actuel 0,40 | % < seuil actuel 0,25 | % < candidat 0,4163 | % < candidat 0,1008 (classif.1) | % < candidat 0,2242 (classif.2) |
|---|---:|---:|---:|---:|---:|
| V0 | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 0,0 % |
| V1 | 32,2 % | 0,0 % | **63,3 %** | 0,0 % | 0,0 % |
| V2 | 100,0 % | 100,0 % | 100,0 % | 0,1 % | 100,0 % |
| V3 | 24,9 % | 0,9 % | 29,4 % | 0,0 % | 0,3 % |

**Lecture importante** : les colonnes « candidat 0,1008 » et « candidat 0,2242 » sont
appliquées à la **même** ablation V2 (construite avec la classification 1 : catégorie
C + les 11 B de la classification 1 mises à NaN, ne laissant que les 3 A de la
classification 1). Elles ne simulent donc pas « B+C manquants selon la classification
2 » (qui laisserait 8 features présentes, pas 3) — seulement l'effet d'un changement
de valeur de seuil sur cette même distribution de ρc. C'est pourquoi le candidat 0,2242
classe 100 % de V2 en dessous (le plafond réel de V2 est 0,1008, bien en dessous de
0,2242 de toute façon), et ne doit pas être lu comme une validation de la
classification 2 sur ce point.

**Observation la plus notable** : remplacer le seuil bannière actuel (0,40) par le
candidat théorique exact « C manquant » (0,4163) ferait **presque doubler** le taux de
déclenchement de la bannière sur V1 (32,2 % → 63,3 %) — la position exacte du seuil,
même à 0,016 près, a un effet non négligeable sur la population concernée. Aucune
recommandation de valeur n'est faite ici — ces chiffres sont fournis à titre
d'information pour une décision hors périmètre de ce rapport.

---

## Conclusion finale

**Confirmé** : le mécanisme ρc lui-même fonctionne exactement comme documenté (formule,
calcul avant WOE, franchissements de seuil stricts et sans incohérence, désactivation
Flux B strictement corrélée à ρc<0,25, correspondance exacte théorie/API au Test 4).
**Infirmé** : les valeurs numériques 0,39 et 0,20 attendues par la conception ne
correspondent pas aux ρc théoriques réellement calculés (0,4163 et 0,1008 en
classification 1 exécutée par le pipeline — le mémoire colle mieux à une classification
alternative, 0,2242, qui n'est pourtant pas celle que le code exécute), et l'intuition
narrative « C manquant ⇒ bannière » est fausse au sens strict (0,4163 ≥ 0,40, la
bannière ne se déclenche pas dans ce cas précis).
**Non testé** : le cas limite ρc exactement égal à 0,40 ou 0,25 (aucun profil de
l'échantillon ne l'atteint), le sous-cas REFUSE-direct de la Session 5 (non observé sur
les 4000 profils), et la classification 2 n'a pas été évaluée en ablation réelle
(Test 2/3), seulement en calcul statique (Test 1) et en relecture des mêmes ρc du Test 2.
