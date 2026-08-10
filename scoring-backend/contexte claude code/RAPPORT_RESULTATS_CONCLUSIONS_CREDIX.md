# RAPPORT — Résultats et conclusions du pipeline CREDIX
## Les CHIFFRES : ce qui est validé, ce qui reste à produire

> **Nature du document.** Document de RÉSULTATS, tenu au fil de l'eau. Il consigne les chiffres
> **validés** (sur Kaggle, ensemble) et les conclusions qui en découlent. Il est le pendant
> « mesures » du document de fond `RAPPORT_DECISIONS_METHODOLOGIQUES_CREDIX.md` (qui, lui, porte le
> *pourquoi* et les références).
>
> **Auteur.** Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY / IT Nearshore.
>
> **Règle.** Aucun chiffre inventé ni anticipé. Les valeurs ci-dessous proviennent des runs déjà
> validés (rapport d'étude Flux A+B). Les sections « À PRODUIRE » listent les mesures encore
> manquantes. Les points marqués `[À RÉCONCILIER]` présentent une incohérence à trancher sur le
> notebook avant fixation dans le mémoire.

---

## 1. Métriques de référence — pipeline WOE (Flux A)

Dataset : Home Credit Default Risk (proxy académique, 307 511 obs., défaut global ~8,07 %). Split
temporel 70/15/15. Taux de défaut réel : validation 9,39 %, test 10,14 %.

> **⚠ Référence canonique = run `CREDIX_v3` (Phase 0.1, juillet 2026).** Les chiffres ci-dessous
> sont ceux de la duplication `CREDIX_v3_quantification_2026-07`, mesurés et validés ensemble.
> Les valeurs des rapports antérieurs (colonne « Réf. antérieure ») provenaient d'une **image
> Kaggle plus ancienne** (version de LightGBM différente) : elles ne sont **pas reproductibles**
> et ne doivent plus être citées. L'écart est un **bruit de reconstruction** (voir §3, encadré
> dérive), négligeable sur le classement.

| Métrique | Validation (v3) | Test (v3) | Réf. antérieure (test) | Écart |
|---|---|---|---|---|
| AUC | 0,7578 | **0,7510** | 0,7513 | 0,0003 |
| Gini | 0,5156 | **0,5020** | 0,5027 | 0,0007 |
| KS | 0,3810 | **0,3732** | 0,3717 | 0,0015 |
| Recall | 0,7277 | **0,7185** | 0,7168 | 0,0017 |
| F1 | 0,2851 | **0,2992** | 0,2988 | 0,0004 |

Contrôles complémentaires (test, v3) : Précision 0,1889 · Brier (avant calibration) 0,2144 ·
Gap Val/Test AUC 0,0068 (OK). Matrice de confusion test (seuil 0,5) : TN 27 017 · FP 14 432 ·
FN 1 317 · TP 3 362.

*(Barre 1 — WOE 27 variables. Seuil de décision 0,5 pour Recall/F1 ; graine unique = 42.)*

**Verdict Phase 0.1 : VALIDÉE.** Tous les écarts < 0,002 (KS à 0,0015, à la limite mais négligeable),
de signes opposés → pas de dégradation, simple bruit de version. Le classement et l'histoire de
discrimination sont reproduits à l'identique.

---

## 2. Choix du modèle — LightGBM vs XGBoost (BK.2) — VALIDÉ

**Comparaison équitable (jeu de validation, recherche aléatoire d'hyperparamètres identique).**

| Métrique | LightGBM | XGBoost | Avantage |
|---|---|---|---|
| AUC-ROC | 0,7575 | 0,7585 | XGBoost |
| Gini | 0,5149 | 0,5171 | XGBoost |
| KS | 0,3848 | 0,3816 | LightGBM |
| Recall | 0,7300 | 0,7272 | LightGBM |
| F1 | 0,2854 | 0,2865 | XGBoost |
| Précision | 0,1774 | 0,1784 | XGBoost |
| Brier | 0,2162 | 0,2155 | XGBoost |

**Test de GOSS (validation, hyperparamètres identiques).** AUC +0,0004 ; **Recall −0,0122** ;
KS −0,0044 ; F1 +0,0027 ; Précision +0,0028 ; Brier −0,0044. (Confirmé sur test : Recall −0,0071.)

**Conclusion.** Écarts tous < 0,002 (barre de bruit ~0,005) → **indistinguables**. GOSS n'apporte
rien (Recall recule) → non activé. LightGBM retenu sur propriétés structurelles + continuité +
réévaluabilité. **Ne jamais présenter comme « on a gardé le moins bon ».**

---

## 3. Recalibration du PDO (BK.1) — VALIDÉ

**Diagnostic (validation).** Proba moyenne annoncée **43,5 %** vs taux réel **9,39 %** (gonflée ×4,6).
Brier **0,216**, ECE **0,34**, courbe de fiabilité entièrement sous la diagonale (sur-confiance
systématique). AUC 0,7578 — le classement est bon, seule l'échelle est fausse.

**Comparaison des 4 méthodes (jeu de test, taux réel 10,14 %).**

| Méthode | Brier | ECE | AUC | Proba. moyenne |
|---|---|---|---|---|
| B1 — sans poids | 0,0831 | 0,0100 | 0,7520 | 9,33 % |
| B2 — Platt | 0,0830 | 0,0093 | 0,7513 | 9,25 % |
| **B3 — isotonique** | 0,0831 | 0,0090 | 0,7507 | 9,25 % |
| SMOTE 20 % (contre-ex.) | 0,0830 | 0,0080 | 0,7527 | 9,40 % |

**Conclusion.** Les 4 calibrent à égalité et **préservent l'AUC**. **B3 isotonique** retenue (choix sur
généralisabilité : aucune forme a priori, découple détection/échelle, réapprise sur tout dataset).
`scale_pos_weight` **conservé**.

**Ré-ancrage du PDO — choix des seuils (Jeu 2, jeu de test).** Comparaison de 5 jeux de seuils en PD ;
Jeu 2 (PD<10 % / PD>30 %) retenu comme meilleur compromis (volume de revue gérable + défaut minimal
chez les acceptés + risque croissant). Ancrage vérifié (v3) : **PD 5 % → score 600,02**. Équivalences
score des frontières : **PD 10 % → 578,5 · PD 30 % → 539,5** (conversions déterministes de la formule
PDO, servent à réaligner les repères visuels 600/500 des vieilles figures — cf. nettoyage final).

> **[RÉCONCILIÉ — Phase 0.2, run CREDIX_v3]** Le `[À RÉCONCILIER]` est **tranché**. Ni le 63,8/32,1/4,1
> (`METHODO_BK1`) ni le 65,9/31,1/3,0 (rapport antérieur) ne correspondent au notebook réel : c'étaient
> des sorties d'images Kaggle antérieures, non reproductibles. **Référence canonique v3 du Jeu 2
> (test) :**
>
> | Jeu 2 — équilibré (PD<10 % / >30 %) | v3 (canonique) |
> |---|---|
> | ACCORDÉ | **67,3 %** |
> | REVUE | **28,6 %** |
> | REFUSÉ | **4,0 %** |
> | défaut réel sur ACCORDÉS | **5,1 %** |
>
> **Point méthodo clé.** Les métriques (classement) ne bougent quasi pas (§1), mais la *répartition
> des décisions* bouge de ±1–2,5 pt entre images : un seuil posé sur une zone dense de PD amplifie un
> déplacement infime du modèle. C'est la distinction **classement robuste / chiffre absolu sensible**.
> Signal rassurant : le **défaut réel sur les ACCORDÉS reste 5,1 %** (vs 5,0 %) — le *volume*
> d'accordés grandit un peu, la *qualité de risque* du pool est inchangée.
>
> **Conséquence actée :** figer les versions (protobuf + lightgbm + scikit-learn) en Section 0 au
> nettoyage final, pour que le % d'accordés soit stable jusqu'à la soutenance. Artefacts backend
> (`lgbm_final.pkl`, `isotonic_calibrator.pkl`, `decision_config.json`) tous issus du **même run v3**
> → mutuellement cohérents ; à régénérer ensemble si re-run.

**Table comparative complète des 5 jeux de seuils (v3, test — pour mémoire) :**

| Jeu | seuils PD | ACC % | REVUE % | REFUSÉ % | déf.ACC | déf.REVUE | déf.REF |
|---|---|---|---|---|---|---|---|
| ACTUEL (réf.) | <5 % / >15 % | 38,9 | 45,7 | 15,5 | 3,1 | 10,2 | 27,5 |
| Jeu 1 — prudent | <8 % / >25 % | 57,4 | 36,1 | 6,5 | 4,4 | 14,9 | 34,6 |
| **Jeu 2 — équilibré** | **<10 % / >30 %** | **67,3** | **28,6** | **4,0** | **5,1** | 17,8 | 39,6 |
| Jeu 3 — large | <12 % / >35 % | 71,4 | 26,6 | 2,0 | 5,5 | 19,9 | 45,1 |
| Jeu 4 — 8/30 | <8 % / >30 % | 57,4 | 38,6 | 4,0 | 4,4 | 15,6 | 39,6 |

---

## 4. Autoencodeur réducteur de dimension (Tâche 6) — VALIDÉ

Protocole à 3 barres, même split, même budget de réglage, `scale_pos_weight = 12,61`. Goulot latent
retenu = 48 (archi 528→159→48→159→528).

| Configuration | Jeu | AUC | Gini | KS | Recall | F1 |
|---|---|---|---|---|---|---|
| Barre 1 — WOE (27) | test | 0,7513 | 0,5027 | 0,3717 | 0,7168 | 0,2988 |
| Barre 2 — brut (528) | test | 0,7713 | 0,5427 | 0,4091 | 0,7442 | 0,3138 |
| Barre 3 — autoenc. (48) | test | 0,7099 | 0,4197 | 0,3115 | 0,7694 | 0,2591 |

**Conclusion.** Effet des données (brut vs WOE) : **+0,0200** d'AUC. Effet de l'autoencodeur (barre 3
vs 2) : **−0,0614** d'AUC (la compression détruit du signal utile). Stabilité val→test ≤ 0,008 (pas de
surapprentissage). **Verdict : AE réducteur ÉCARTÉ** (moins discriminant + explicabilité par variable
détruite — motifs *généralisables*). L'avantage brut>WOE est **local** à la richesse des tables Home
Credit → posé en **piste** (dériver des features nommées passées par WOE+NAP), pas en verdict.

---

## 5. Flux B — détecteur d'anomalie (IF / AE / LOF) — VALIDÉ

**Comparaison par famille d'anomalie (régime équilibré 50/50, moyenne intensités 2/5/9).**

| | Isolation Forest | Autoencodeur | LOF |
|---|---|---|---|
| AUROC — permutation | 0,503 | **0,608** | 0,582 |
| AUROC — extrêmes | 0,893 | **0,971** | 0,962 |
| AUROC — mixte | 0,666 | **0,808** | 0,796 |
| Victoires strictes (9 croisements) | 0/9 | **8/9** | 1/9 |

**Calibration du seuil (jeu mixte réaliste 5 %, bénéfice = anomalies attrapées).**

| Détecteur | Bénéfice à P95 (coût ~5 %) | Bénéfice à P99 (coût ~1 %) |
|---|---|---|
| Autoencodeur | 54,1 % | 43,2 % |
| Isolation Forest | 38,0 % | 26,9 % |

**Conclusion.** **AE = détecteur principal**, **IF = fallback**, **LOF écarté du déploiement** (RGPD :
transporte les données clients ; O(N_train)). L'effondrement de l'IF sur la permutation (0,503 ≈
hasard) = angle mort documenté sur les anomalies internes/non périphériques. **Seuil P95 vs P99 non
tranché** (dépend du PDO recalibré + capacité de revue).

---

## 6. Résultats À PRODUIRE (Niveau 1 — runs légers, ciblés)

Ce sont les **seules vraies preuves manquantes** de la matrice de démonstration (le reste est fait ou
relève de la littérature).

- [x] **(a) ρc par tranche** — ✅ **VALIDÉ (run CREDIX_v3, test, 30/07)** — voir §8 ci-dessous.
- [x] **(b) Flux B intégré sur test** — ✅ **VALIDÉ (30/07)** — test « défaut ACCORDÉ+anomalie »
  écarté (anomalie ≠ défaut, hors-sujet) ; test conservé = biais dossier incomplet → **angle mort**
  documenté (§9). Le Flux B ne sur-signale PAS les incomplets (effet médiane), ce qui justifie le
  garde-fou ρc<0,25.
- [ ] **(c) Ablation V0→V6** — isoler l'effet de chaque bloc (baseline → +WOE → +IV → +NAP →
  +scale_pos_weight → +isotonic), table AUC/Gini/KS/Recall/F1/Brier/ECE par version. *(Prouve le coût
  de chaque bloc.)*
- [ ] **(d) Une alternative par bloc (ciblé)** — IV vs Mutual Information ; binning optimal vs binning
  par quantiles ; NAP vs sélection par VIF. *(Prouve « pas au hasard » — cf. FOND §4. Une passe
  chacun ; on ne fait PAS WOE vs One-Hot, tranché par la littérature.)*

**Prérequis avant ces runs :** ~~vérification des chiffres existants~~ **FAIT (Phase 0.1 + 0.2,
run v3, validé).** Le `[À RÉCONCILIER]` du §3 est levé.

---

## 6-bis. Sauvegardes backend ajoutées (Section 12.0, run v3) — VALIDÉ

Deux trous de sauvegarde identifiés à l'audit du notebook (voir `AUDIT_NOTEBOOK_CREDIX.md`) ont été
bouchés par deux cellules ajoutées en Section 12.0 (« on étend, on ne modifie pas ») :

- **12.0a — `isotonic_calibrator.pkl`.** La calibration BK.1 n'était jamais sauvegardée ; `lgbm_final.pkl`
  seul renvoie des PD **gonflées**. Objet isotonique désormais appris sur validation et sauvegardé.
  Contrôle v3 (test) : proba moyenne **43,47 % → 9,28 %** (taux réel 10,14 %) ; **garde-fou AUC
  |Δ| = 0,0005** (transformation monotone → classement préservé ; le ~0,0005 est l'effet des ex æquo
  créés par les paliers isotoniques sur le calcul de l'AUC, pas une perte de discrimination).
- **12.0b — `decision_config.json`.** Seuils (Jeu 2 : PD 10 %/30 %) + `offset`/`factor` centralisés
  dans un fichier unique (source de vérité notebook + backend). Contrôle v3 : ancrage PD 5 % → 600,02 ;
  frontières 578,5 (PD 10 %) / 539,5 (PD 30 %).

**Chaîne d'inférence backend Flux A (validée) :**
`X → woe_transformers → nap_features → lgbm_final.predict_proba → isotonic_calibrator.predict →
PD juste → PDO(offset,factor) → décision(pd_accorde, pd_refuse)`.

---

## 7. Conclusions transversales (fil directeur)

À chaque bifurcation du projet, l'option retenue n'est **pas** la plus performante dans l'absolu, mais
celle qui reste **défendable une fois toutes les contraintes réunies** (performance, explicabilité,
gouvernance, généralisabilité) :

- **Modèle** : équivalence mesurée → LightGBM sur critères structurels + continuité.
- **Calibration** : isotonique sur généralisabilité, `scale_pos_weight` conservé.
- **Seuils** : Jeu 2 comme hypothèse de travail, méthode générale d'Elkan nommée.
- **Représentation** : WOE conservé (seul à satisfaire les 4 exigences d'un scoring régulé) ; brut et
  autoencodeur écartés malgré l'avantage AUC du brut.
- **Garde-fou** : autoencodeur, escalade conservative.

**Réserves permanentes affichées :** proxy (Home Credit) + graine unique → *le classement des
approches est robuste, les valeurs absolues sont sensibles*. Perspectives : étude multi-graines,
validation sur un 2ᵉ dataset (German Credit), récupération du signal des tables secondaires dans le
cadre explicable.

---

## 8. Preuve ρc — performance par tranche de couverture (Phase 1.1) — VALIDÉ

**Objectif du test.** ρc mesure la couverture d'information d'un dossier (poids IV des variables
présentes / poids IV total). Il ne touche ni l'AUC ni le Gini globaux → une ablation classique ne
peut PAS prouver sa valeur. La seule preuve possible est une **partition** : si ρc mesure vraiment la
fiabilité du score, alors les clients à ρc faible doivent être **moins bien scorés**. On mesure donc
AUC + Brier + ECE **par tranche de ρc** sur le jeu de test (46 128 clients, jamais touché avant).

**Adaptation du découpage (documentée, cf. RAPPORT_DECISIONS §7-ter).** Les seuils opérationnels
(< 0,25 / 0,25–0,40 / ≥ 0,40) donnent des tranches **vides** sur ce proxy : sur le test,
n(<0,25) = **0** et n(0,25–0,40) = **1**. Confirmé par la distribution : ρc **min = 0,3918**,
moyenne 0,8891, médiane 0,922. Home Credit est trop « fully-banked » — aucun vrai thin-file extrême.
Le code bascule donc **automatiquement en terciles** (3 groupes de 15 376 clients : ρc bas / moyen /
haut), mode affiché explicitement.

**Résultats (test, run v3, probas calibrées isotonique) :**

| Tranche | n | Taux défaut réel | AUC | Brier | ECE |
|---|---|---|---|---|---|
| T1 — ρc bas | 15 376 | 10,52 % | **0,7322** | 0,0869 | 0,0086 |
| T2 — ρc moyen | 15 376 | 10,64 % | **0,7530** | 0,0863 | 0,0117 |
| T3 — ρc haut | 15 376 | 9,27 % | **0,7650** | 0,0759 | 0,0078 |
| **RÉFÉRENCE globale** | 46 128 | 10,14 % | 0,7505 | 0,0830 | 0,0090 |

**Lecture des trois métriques :**

- **AUC — preuve validée (Niveau I).** 0,7322 → 0,7530 → 0,7650 : **strictement croissante** avec
  ρc (monotonie confirmée automatiquement par le code). C'est le résultat central : *plus le dossier
  est complet, mieux le modèle discrimine les bons des mauvais payeurs*. ρc mesure donc bien une
  fiabilité réelle du score. Écart T1→T3 = **+0,033 d'AUC**.

- **Brier — cohérent, tendance dans le bon sens.** 0,0869 → 0,0863 → 0,0759 : descend globalement
  (descendre = mieux calibré). Le gros du gain est sur T3 ; T1 et T2 sont quasi identiques (écart
  0,0006, négligeable). Direction attendue, sans être un escalier parfait.

- **ECE — non monotone (nuance honnête).** 0,0086 → 0,0117 → 0,0078 : c'est la tranche **médiane**
  (T2) qui est la moins bien calibrée, pas la tranche basse. Ce n'est PAS le schéma attendu. Cause
  probable : l'ECE range les clients en petits paquets de 10 % de probabilité ; sur des sous-groupes
  de 15 k clients, un peu de bruit statistique suffit à faire bouger le classement. À noter aussi que
  **les trois valeurs ECE sont toutes très petites** (0,008–0,012) et proches de la référence globale
  (0,009) : l'amplitude de la non-monotonie est minime en valeur absolue.

**Conclusion honnête.** La preuve de ρc repose principalement sur l'**AUC** (monotone, nette) et est
**appuyée par le Brier** (cohérent). L'**ECE** n'appuie pas la démonstration (non monotone), ce qui
est documenté comme une limite plutôt que dissimulé — les deux métriques discriminantes suffisent à
établir que ρc mesure bien une fiabilité réelle.

**Réserve du proxy.** Le gradient d'AUC (+0,033) est **réel mais modeste**, car même le tiers bas
(T1) contient surtout des dossiers assez complets (ρc min = 0,39). Sur une population avec de vrais
thin-file (ρc < 0,25), le contraste serait mécaniquement plus fort. ρc prend donc **toute sa valeur
sur données réelles à forte proportion de dossiers minces**, pas sur ce proxy. C'est un argument
supplémentaire pour la validation future sur un 2ᵉ dataset.

**Figure :** `fig12_1_rho_tranches.png` (4 panneaux : distribution ρc + AUC/Brier/ECE par tranche
avec ligne de référence globale). **Niveau de preuve : I** (démontré empiriquement sur test
indépendant) pour l'AUC/Brier ; l'adaptation du découpage est de Niveau III (documentée).
**Réfs :** Chow (1970), El-Yaniv & Wiener (2010) `[À VÉRIFIER]`.

---

## 9. Flux B intégré sur le test (Phase 1.2) — angle mort sur dossiers incomplets

**Ce qui a été fait.** Première exécution du Flux B sur le jeu de **test** (46 128 clients) :
encodage 61 dims (`transformer_brut`) → autoencodeur → `log1p(MSE)` → flag anomalie aux seuils P95 et
P99 **chargés depuis `ae_metadata.json`** (P95 = 0,1775 ; P99 = 0,2451 ; calibrés sur injections
synthétiques, non supervisés). Taux de signalement sur le test : **5,82 % à P95**, **1,18 % à P99**
(cohérent avec la calibration ~5 %/~1 %).

**Test « défaut chez ACCORDÉ + anomalie » : ÉCARTÉ.** Il reviendrait à mesurer un lien
anomalie → défaut qu'on sait hors-sujet par construction (anomalie ≠ défaut). La valeur du Flux B est
établie par l'injection synthétique (§5), pas par le défaut. Voir `RAPPORT_DECISIONS §7-quinquies`.

**Test conservé — le Flux B pénalise-t-il les dossiers incomplets ?** Taux de signalement anomalie
par tercile de ρc (zone active ρc ≥ 0,25 = 100 % du test ici) :

| Tercile ρc | n | Signalement P95 | Signalement P99 |
|---|---|---|---|
| T1 — ρc bas | 15 376 | 4,07 % | 0,78 % |
| T2 — ρc moyen | 15 376 | 4,18 % | 1,03 % |
| T3 — ρc haut | 15 376 | **9,22 %** | **1,73 %** |

**Lecture.** L'inquiétude initiale (les dossiers incomplets seraient sur-signalés) est **levée** :
c'est **l'inverse** qui s'observe — ce sont les dossiers **complets** (T3) qui sont le plus souvent
flaggés (9,22 % vs 4,07 % à P95).

**⚠ À NE PAS présenter comme une victoire.** Cette absence de sur-signalement des incomplets vient du
**remplacement des valeurs manquantes par la médiane du train** : un dossier troué est « maquillé »
en profil moyen (des valeurs inventées, pas les vraies), donc facile à reconstruire pour l'AE, donc
peu signalé. La conséquence est un **angle mort** : sur un dossier très incomplet, le Flux B perd son
pouvoir de détection. Une atypie — voire une fraude — logée dans les variables manquantes passerait
sous le radar. Ce résultat **justifie a posteriori** le garde-fou **ρc < 0,25** (désactivation du
Flux B + revue humaine) et invite à vérifier que ce seuil est au bon endroit.

**Réserve du proxy.** ρc min = 0,3918 → aucun vrai thin-file testé ; l'angle mort est ici **raisonné,
pas mesuré à l'extrême**. À quantifier sur données réelles à forte proportion de dossiers minces.

**Figure :** `fig12_2_fluxb_integre.png`. **Niveau de preuve : I** (constat mesuré) + III (lecture
« angle mort → garde-fou ρc », bonne pratique d'ingénierie).

---

*Document au fil de l'eau — à compléter après chaque run validé. Dernière mise à jour : session
« Phase 1 » (30/07), run CREDIX_v3 — **Phase 1 CLOSE** : 1.1 (ρc par tranche) + 1.2 (Flux B intégré,
angle mort dossiers incomplets) validées. Prochain : Phase 2 (ablation V0→V6).*
