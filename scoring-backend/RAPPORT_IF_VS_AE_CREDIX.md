# Rapport Technique — Flux B : Détection d'Anomalie Zero-Day
## Isolation Forest vs Autoencoder Keras — CREDIX
> Singhe Penka Hendrix Donavan — 21P050 — ENSPY GI2026
> Document de contexte pour nouvelle session de discussion

---

## 1. Contexte du Flux B

Le système CREDIX repose sur trois mécanismes complémentaires :

| Mécanisme | Question posée | Statut |
|---|---|---|
| ρc (couverture prédictive) | Ai-je assez d'info sur ce client ? | ✅ En production |
| LightGBM + WoE | Ce client va-t-il faire défaut ? | ✅ En production |
| Flux B (IF ou AE) | Ce profil ressemble-t-il aux profils connus ? | ✅ En production (AE) |

**Règle d'escalade Flux B :**
- Anomalie détectée + ACCORDÉ → REVUE_MANUELLE forcée
- Anomalie détectée + REFUSÉ → inchangé (déjà le pire cas)
- Anomalie détectée + REVUE → inchangé (déjà en revue)
- ρc < 0.25 → Flux B désactivé (features imputées avec médianes = faux positifs systématiques)

---

## 2. Les Métriques Utilisées — Explications

### 2.1 AUC proxy (Area Under the Curve)

**Calcul :** On utilise les labels de défaut (0 = bon payeur, 1 = défaut) du dataset Home Credit comme proxy. L'AUC mesure si le score d'anomalie est plus élevé pour les défauts réels que pour les bons payeurs.

**Formule :**
```
AUC = P(score_défaut > score_bon_payeur)
AUC = 0.5 → le modèle ne distingue rien (aléatoire)
AUC = 1.0 → séparation parfaite
```

**Résultats :**
```
IF  : AUC = 0.5554
AE  : AUC = 0.5595
LOF : AUC = 0.5451
```

**Limitation importante :** Cette métrique est un PROXY. L'IF et l'AE ne sont pas entraînés pour prédire le défaut — ils détectent les profils rares parmi les bons payeurs. Utiliser les labels de défaut pour les évaluer est une approximation. Un AUC proche de 0.5 est attendu et ne signifie pas que le modèle est mauvais — cela signifie que "rare" ≠ "défaut".

### 2.2 Corrélation avec la PD LightGBM (Corrélation de Pearson)

**Calcul :** Corrélation linéaire entre le score d'anomalie (IF ou AE) et la probabilité de défaut PD calculée par LightGBM.

```
r = corrélation(score_anomalie, PD_lightgbm)
```

**Résultats :**
```
IF  : r = 0.1088
AE  : r = 0.0776
```

**Interprétation :** Une corrélation FAIBLE est en réalité souhaitable ici. Si r était proche de 1, le Flux B ne ferait que répéter ce que LightGBM dit déjà. L'intérêt du Flux B est de capter une dimension INDÉPENDANTE. La corrélation de 0.11 de l'IF signifie que dans 89% des cas, l'IF et LightGBM ont des avis différents sur le même client — c'est la complémentarité recherchée.

**Argument contre l'AE :** r = 0.0776 pour l'AE est encore plus faible → encore plus indépendant. Mais cela peut aussi signifier que l'AE capture du bruit plutôt qu'une vraie dimension de risque.

### 2.3 Test de Mann-Whitney

**Calcul :** Test statistique qui vérifie si les scores d'anomalie des défauts réels sont significativement plus élevés que ceux des bons payeurs.

**Hypothèse nulle :** "les scores d'anomalie sont identiques pour défauts et bons payeurs"  
**p-valeur :** probabilité d'obtenir ce résultat si l'hypothèse nulle est vraie

**Résultats :**
```
IF  : p-valeur = 1.18 × 10⁻³³  → signal statistiquement réel
AE  : p-valeur = 1.01 × 10⁻⁶⁵  → signal encore plus fort
LOF : non significatif → éliminé
```

**En clair :** p < 0.05 confirme que le modèle capte un vrai signal, pas du hasard. Les deux p-valeurs sont extrêmement petites — les deux modèles captent un signal réel. L'AE a une p-valeur plus petite mais les deux sont amplement suffisantes.

---

## 3. Les Algorithmes — Implémentation et Méthodologie

### 3.1 Isolation Forest

**Principe :**
L'IF isole les points en faisant des coupes aléatoires sur les features. Un point anormal est isolé rapidement (peu de coupes). Un point normal nécessite beaucoup de coupes.

**Données d'entraînement :** 199 444 bons payeurs (classe 0 du train set)

**Preprocessing :**
```
Features numériques (20) :
  → Imputation NaN avec médianes du train set
  → StandardScaler : z = (x - moyenne) / écart_type

Features catégorielles (7) :
  → FrequencyEncoder : chaque modalité remplacée par sa fréquence dans le train set
    ex: OCCUPATION_TYPE = "Managers" → 0.08 (8% des bons payeurs)

Assemblage : 27 features dans l'ordre features_total
```

**Hyperparamètres retenus :**
```python
IsolationForest(
    n_estimators=200,    # nombre d'arbres
    contamination=0.05,  # proportion attendue d'anomalies
    random_state=42      # déterministe à 100%
)
```

**Score :**
```
score_if = -isolation_forest.score_samples(X)
# Plus élevé = plus anormal
```

**Seuil :**
```
# Calculé sur les 199 444 bons payeurs TRAIN
scores_train = -IF.score_samples(X_train_class0)
seuil_P95    = np.percentile(scores_train, 95)
seuil_P95    = 0.5452   # 95% des bons payeurs sont en dessous
```

**Artefacts produits :**
- `isolation_forest.pkl` — le modèle IF
- `scaler_if.pkl` — dict avec scaler + médianes + noms features
- `encoder_if.pkl` — dict {feature: {modalité: fréquence}}
- `if_metadata.json` — seuil P95, architecture, métriques

**Avantages :**
- 100% déterministe (random_state=42 → même seuil à chaque run)
- Conçu pour données tabulaires basse dimension
- Latence 0.01ms par client
- Corrélation PD plus forte (0.1088 → plus cohérent avec LightGBM)
- Seuil stable d'un run à l'autre

**Limites :**
- Coupes aléatoires → peut rater une anomalie si elle tombe dans une région bien partitionnée par hasard
- Ne capture pas les relations non-linéaires entre features
- AUC légèrement inférieur (0.5554 vs 0.5595)

### 3.2 Autoencoder Keras

**Principe :**
L'AE apprend à comprimer le profil de 27 features en 8 dimensions (bottleneck), puis à le reconstruire. Entraîné uniquement sur bons payeurs, il reconstruit mal les profils inhabituels.

**Données d'entraînement :** 199 444 bons payeurs (classe 0 du train set)

**Preprocessing (identique à l'IF) :**
```
Même StandardScaler + FrequencyEncoder → mêmes 27 features dans le même ordre
```

**Architecture :**
```
Input : 27 features
→ Dense(15, activation='relu')
→ Dense(8, activation='relu')    ← bottleneck (compression)
→ Dense(15, activation='relu')
→ Dense(27, activation='linear') ← reconstruction
Output : 27 features reconstruites
```

**Entraînement :**
```python
autoencoder.compile(optimizer='adam', loss='mse')
autoencoder.fit(
    X_train_class0, X_train_class0,  # X=y (reconstruction)
    epochs=200,
    batch_size=512,
    validation_split=0.1,
    callbacks=[EarlyStopping(patience=15)]
)
# Arrêt automatique à epoch ~193 (EarlyStopping)
```

**Score :**
```
X_reconstructed = autoencoder.predict(X_client)
MSE_brute      = mean((X_client - X_reconstructed)²)
score_ae       = log1p(MSE_brute)   # = log(1 + MSE)
```

**Pourquoi log1p ?**
L'AE apprend très bien → MSE brutes très petites (0.001 à 0.01). La normalisation min-max compresserait tout vers 0. log1p étale naturellement la distribution sans dépendre d'un maximum arbitraire et sans créer d'infini (log(0) = -∞ mais log1p(0) = 0).

**Seuil :**
```
# Calculé sur les 199 444 bons payeurs TRAIN (pas la validation)
X_recon_train = autoencoder.predict(X_train_class0)
MSE_train     = mean((X_train_class0 - X_recon_train)², axis=1)
scores_train  = log1p(MSE_train)
seuil_P99     = np.percentile(scores_train, 99)
seuil_P99     = 0.42897   ← seuil actuel en production
```

**Pourquoi P99 et pas P95 ?**
- P95 → 5% de faux positifs sur bons payeurs → trop d'escalades inutiles
- P99 → 1% de faux positifs → plus sélectif, escalades plus pertinentes
- Résultat en production : 0.9% des clients flaggés à P99 vs 5.9% à P95

**Stochasticité — problème identifié :**
```
Run 1 → seuil P99 = 0.537594
Run 2 → seuil P99 = 0.428970
```
Le seuil varie entre runs car TensorFlow est non-déterministe sur CPU multi-thread malgré `tf.random.set_seed(42)`. Solution partielle : `os.environ['TF_DETERMINISTIC_OPS'] = '1'` avant l'import.

**Artefacts produits :**
- `autoencoder_credix.keras` — le modèle Keras (format natif)
- `ae_metadata.json` — seuil P99, architecture, métriques, méthode log1p
- Réutilise `scaler_if.pkl` et `encoder_if.pkl` (même preprocessing)

**Avantages :**
- Bottleneck 27→8→27 : apprend la "essence" d'un profil normal → meilleure généralisation zero-day théorique
- AUC légèrement supérieur (0.5595 > 0.5554)
- Plus adapté à la montée en charge (GPU, grands volumes futurs)
- p-valeur Mann-Whitney plus faible (signal plus fort statistiquement)

**Limites :**
- Stochastique : seuil peut varier entre deux entraînements
- Latence 0.07ms (7× plus lent que IF)
- Corrélation PD plus faible (0.0776 vs 0.1088 pour IF)
- Dépendance TensorFlow (~500MB en plus dans le conteneur Docker)

---

## 4. Décision Finale et Architecture en Production

**Modèle principal : Autoencoder Keras**
Justification retenue :
1. Bottleneck 27→8→27 = mécanisme de compression forcée → meilleure généralisation zero-day
2. Perspective d'extension à millions d'observations : AE bénéficie de GPU et de plus de données
3. AUC supérieur et signal Mann-Whitney plus fort
4. P99 → taux de faux positifs 5× inférieur à P95 de l'IF

**Fallback : Isolation Forest**
Utilisé si `autoencoder_credix.keras` absent de GridFS au démarrage

**Flux B désactivé si ρc < 0.25**
(thin-file : features imputées avec médianes → scores non représentatifs)

---

## 5. Implémentation Backend

**Fichiers modifiés :**
```
app/main.py          → 11 artefacts (+ keras loader + AE dans _ARTEFACTS_IF)
app/routers/
  scoring.py         → is_new_client=False après scoring
                       last_score avec champs IF/AE
                       if_seuil retourne seuil AE ou IF selon modèle actif
  clients.py         → recherche $expr+$concat pour "prénom nom" combiné
  upload_model.py    → 11 artefacts (était 9)
app/services/
  pipeline_service.py → appliquer_flux_b() : AE prioritaire → IF fallback
                        _appliquer_ae() : log1p(MSE) sur 27 features
                        _appliquer_if() : conservé en fallback
                        rho_c >= 0.25 requis pour activer Flux B
```

**Réponse API POST /api/scoring/predict :**
```json
{
  "score_pdo": 537,
  "decision": "REVUE_MANUELLE",
  "anomaly_score": 0.478149,
  "is_anomaly": true,
  "if_escalade": false,
  "if_seuil": 0.42897,
  "decision_initiale": null
}
```

---

## 6. Questions Ouvertes pour la Prochaine Discussion

1. **Les métriques AUC et corrélation sont-elles les bonnes pour évaluer un détecteur d'anomalie ?** Non — elles sont des proxies imparfaits. Les vraies métriques métier seraient : taux de validation superviseur sur escalades, taux de faux positifs en production.

2. **IF ou AE — argument de poids restant à approfondir ?** La stochasticité de l'AE est le point le plus faible pour un contexte bancaire d'audit. Comment le résoudre proprement avec `TF_DETERMINISTIC_OPS` ?

3. **Slide 10 du PowerPoint** — contient encore l'ancienne décision d'élimination de l'AE. Doit être mis à jour pour refléter la correction log1p et le nouveau choix.

4. **Slide 18** — Synthèse Q1 doit être révisée : AE retenu, non éliminé.

---

*Document généré le 29 juin 2026 — Session Frontend 2 + Session Backend AE*
*À coller en contexte pour la prochaine session de discussion IF vs AE*
