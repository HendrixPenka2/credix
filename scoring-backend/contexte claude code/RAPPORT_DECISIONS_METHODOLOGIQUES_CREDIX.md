# RAPPORT — Décisions méthodologiques du pipeline CREDIX
## Le FOND : pourquoi chaque bloc, avec quelles preuves et quelles références

> **Nature du document.** Document de FOND, tenu au fil de l'eau. Il consigne *pourquoi* chaque
> décision du pipeline a été prise, *comment* on la prouve, et *avec quelles références*. Il est le
> pendant « concepts + justifications » du document de résultats
> `RAPPORT_RESULTATS_CONCLUSIONS_CREDIX.md` (qui, lui, porte les chiffres).
>
> **Auteur.** Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY / IT Nearshore.
>
> **Principe d'or.** On distingue toujours trois registres : (1) ce qui est *démontré* sur nos
> données, (2) ce qui est *ancré dans la littérature* et le domaine, (3) ce qui est une *hypothèse de
> travail assumée*. On ne déguise jamais l'un en l'autre. Aucune affirmation n'est retenue sans être
> soit mesurée, soit référencée, soit explicitement posée comme hypothèse.
>
> **Statut des références.** Les références marquées `[À VÉRIFIER]` doivent être confirmées (auteur,
> année, titre exact, chiffre cité) avant citation finale dans le mémoire.

---

## 1. Le principe directeur : « chaque bloc sert un objectif »

Un projet de scoring de crédit ne poursuit **pas un seul objectif**, mais plusieurs, parfois en
tension directe. Juger *chaque* bloc du pipeline à l'aune d'une *seule* métrique globale (typiquement
l'AUC) est donc une **erreur de méthode**. Certains blocs sont, par construction, conçus pour arbitrer
entre objectifs — quitte à ne pas améliorer, voire à dégrader légèrement, une métrique globale.

La bonne question n'est jamais « est-ce que l'AUC monte ? » mais :

> **« Quel objectif ce bloc sert-il, et quelle métrique précise prouve qu'il l'atteint réellement ? »**

Les objectifs conjoints d'un scoring régulé sont : la **discrimination** (AUC/Gini/KS/Recall), la
**calibration** des probabilités (Brier/ECE), l'**explicabilité et la conformité** (Bâle II, RGPD
art. 22), la **gestion asymétrique du risque** (un défaut manqué coûte plus qu'un refus abusif →
priorité au Recall), la **stabilité/robustesse**, la **gouvernance de la décision** (savoir *quand*
faire confiance au score), et la **protection contre les profils atypiques/fraude**.

---

## 2. L'échelle de preuve à 3 niveaux

On ne peut pas *démontrer* tous les blocs au même degré — et vouloir le faire affaiblirait le mémoire
(certaines « preuves » seraient fabriquées ou disproportionnées). Trois niveaux de preuve coexistent,
**tous légitimes** :

- **Niveau I — Démontré empiriquement sur nos données** (ablation, partition, injection).
  On montre des chiffres.
  *Ex. : `scale_pos_weight`, calibration isotonique, ρc (partition), Flux B (injection),
  équivalence LightGBM/XGBoost, ablation IV/NAP.*

- **Niveau II — Ancré dans la littérature + le domaine** (une expérience dédiée serait
  disproportionnée ou le point est un standard établi). On **cite**, on ne re-run pas.
  *Ex. : seuil IV 0,02 et paliers (Siddiqi 2006) ; plage du goulot AE 10–50 % ; hyperparamètres LOF
  (Breunig 2000) et IF (Liu 2008).*

- **Niveau III — Hypothèse de travail assumée** (indémontrable sur un proxy sans données métier
  réelles). On **nomme** l'hypothèse et la méthode générale qui s'appliquerait sur données réelles.
  *Ex. : les seuils de décision 10 %/30 % → méthode générale d'Elkan (2001).*

**Message de méthode (pour l'oral) :** *« J'ai démontré ce qui se démontre, cité ce qui relève de
l'état de l'art, et assumé ce qui dépend de coûts métier réels. »* C'est cela, la rigueur — pas
« tout démontrer coûte que coûte ».

---

## 3. La hiérarchie des objectifs (rend l'arbitrage falsifiable)

« Un bloc sert un objectif même s'il baisse une métrique » ne tient que si les objectifs sont
**hiérarchisés** :

1. **Contraintes dures (non négociables)** : explicabilité par variable (Bâle II / RGPD art. 22),
   calibration des probabilités (sans elle, le score PDO n'a pas de sens métier), traçabilité /
   versioning.
2. **Priorité métier assumée** : Recall > Precision (coût d'un faux négatif ≫ coût d'un faux positif).
3. **À arbitrer** : discrimination brute (AUC/Gini/KS) vs parcimonie / gouvernabilité.
4. **Garde-fous** : stabilité (écart val→test), ρc, Flux B — jugés sur *leur* métrique propre.

**Règle de décision (falsifiable) :**

> Un bloc est retenu **ssi** *(il fait progresser son objectif assigné, mesuré)* **et** *(son coût
> tombe sur une métrique qui n'est ni une contrainte dure, ni la priorité métier)*.

Deux applications qui prouvent que le cadre n'est pas une excuse mais un juge :
- Le **témoin brut-528** gagne l'AUC (+0,02) mais son coût tombe sur une *contrainte dure*
  (explicabilité) → **écarté**.
- L'**autoencodeur réducteur** échoue *à la fois* sur une contrainte dure (explicabilité) *et* sur la
  discrimination → **écarté**.
Le même cadre a, à l'inverse, fait *garder* `scale_pos_weight` (coût sur Precision/F1, non
prioritaires). Même grille, verdicts opposés.

---

## 4. Matrice de démonstration par bloc

Pour chaque bloc : l'objectif servi, le coût assumé, les alternatives crédibles, la raison du choix
*pour cet objectif*, et la preuve avec son **statut** (I / II / III ; fait / à run).

| Bloc | Objectif servi | Coût assumé | Alternatives | Pourquoi CE choix | Preuve — statut |
|---|---|---|---|---|---|
| **WOE + bin « Manquant »** | Explicabilité (log-cote monotone lisible) + NaN traité comme signal | Un peu de discrimination pure | Target/mean encoding, One-Hot, imputation médiane+brut | Standard scorecard (Siddiqi 2006) ; linéarise la relation variable→risque ; le bin « Manquant » capte l'absence (vital thin-file). One-Hot explose la dimension ; l'imputation détruit le signal NaN | I+II — *à run : AUC bin Manquant vs imputation médiane ; nombre de variables où WOE(Manquant)≠0* |
| **Filtre IV (0,02)** | Parcimonie / auditabilité (pré-filtre univarié) | Peut écarter une interaction faible mais réelle | Mutual Information, χ², aucun filtre | Tradition scorecard, paliers interprétables, seuil documenté (Siddiqi 2006). IV est univarié → **complété par NAP** (paire, pas IV seul) | I+II — *à run : AUC avec/sans filtre ; IV vs MI* |
| **NAP** | Stabilité / anti-colinéarité (confirmation multivariée) | Peut ne rien améliorer, voire baisser légèrement l'AUC test | VIF-selection, élagage par corrélation, RFE | Mesure l'importance *toutes autres variables présentes* → traque la redondance qu'un critère univarié ne voit pas. **Ici a tout conservé (27/27) → rôle CONFIRMATOIRE** (garde-fou), pas élagage | I — *à run : VIF moyen avant/après ; variance de l'importance sur plusieurs seeds* |
| **scale_pos_weight** (~11,4) | Gestion asymétrique du risque (Recall priorisé) | Precision/F1 dégradés (volontaire) + probas gonflées (→ réparé par isotonic) | SMOTE, class_weight, aucun rééquilibrage, focal loss | Pas de faux clients (vs SMOTE) ; garde la vraie distribution ; le gonflement est **proprement réparable** par calibration a posteriori. Sans lui, le Recall s'effondre (cas d'école : GradientBoosting Recall 0,029) | I — **fait** + *ablation V3→V4* |
| **Calibration isotonique** | Probas justes (Brier/ECE) → PDO exploitable | **AUC inchangée** (transformation monotone) — l'exemple le plus pur | Platt (sigmoïde), sans-poids (B1), SMOTE (contre-ex.) | N'impose aucune forme a priori (Platt impose un S) → robuste au changement de dataset ; découple détection (poids conservé) et échelle. Choix sur **généralisabilité** | I — **fait** (BK.1) |
| **ρc** (indice de couverture) | Gouvernance / confiance (quand faire confiance au score) | **Aucun** — pas une variable du modèle, 0 effet sur AUC/Gini | Aucun indice ; couverture non pondérée | Pondéré par l'IV : une source manquante à fort IV pèse plus qu'une à faible IV. **Une ablation classique ne captera JAMAIS sa valeur** → métrique différente requise | I (métrique dédiée) — *à run : AUC/Brier **par tranche** de ρc (partition risque-couverture)* |
| **Flux B** (AE / IF) | Protection profils atypiques / fraude | Ne peut QUE réduire l'approbation automatique (attendu, pas un défaut) | IF / AE / **LOF** (comparés) ; ou pas de garde-fou | AE voit les anomalies internes (permutation) où l'IF est aveugle (angle mort documenté) ; LOF bon mais transporte les données clients (RGPD) → écarté | I — **fait** (injection) + *à run : défaut « ACCORDÉ+anomalie » vs « ACCORDÉ sain »* |
| **LightGBM** (le modèle) | Le classifieur supervisé | *voir §5* | XGBoost, Random Forest, Régression logistique, GradientBoosting | *voir §5* — équivalence mesurée, choix sur critères structurels/continuité/réévaluabilité | I — **fait** (BK.2) |

---

## 5. Focus — Le choix du modèle (LightGBM vs XGBoost)

**La formulation à NE JAMAIS employer :** *« XGBoost était meilleur mais on a gardé LightGBM. »*
C'est la porte ouverte à la question qui tue (« vous avez donc gardé le moins bon ? ») **et c'est faux**.

**La vérité mesurée**, en trois temps :
1. **Équivalence.** Sur le proxy Home Credit, LightGBM et XGBoost sont **indistinguables** : tous les
   écarts sont < 0,002, sur une exécution unique, sans test statistique (XGBoost devance marginalement
   sur 5/7 métriques, ex. AUC 0,7585 vs 0,7575 ; LightGBM sur KS et Recall). Aucun argument de
   *performance* ne départage.
2. **GOSS testé.** Le seul mécanisme réellement propre à LightGBM (Gradient-based One-Side Sampling) a
   été **activé et comparé** au mode standard (`gbdt`), à hyperparamètres identiques → **aucun gain**,
   et le Recall (prioritaire) recule. Par cohérence avec le rejet des écarts de XGBoost (même barre de
   bruit ~0,005), GOSS **n'est pas activé**.
3. **Choix assumé sur d'autres critères** (hors performance) : (a) **propriétés structurelles**
   adaptées au crédit — GOSS, EFB (variables creuses fréquentes en crédit), croissance leaf-wise,
   gestion native des catégorielles (Ke et al. 2017) — décrites comme **propriétés** (avantageuses à
   l'échelle et sur données catégorielles), **non** comme gains prouvés sur nos données ;
   (b) **continuité du pipeline** (calibration, SHAP, PDO, Flux B déjà construits autour de LightGBM) ;
   (c) **choix réévaluable** (l'architecture est agnostique au classifieur).

> **Honnêteté à afficher :** la croissance leaf-wise n'est **pas exclusive** à LightGBM — XGBoost la
> propose via `grow_policy=lossguide` (Chen & Guestrin 2016). À présenter comme le *défaut* de
> LightGBM, pas comme un avantage exclusif.

**Matière externe utilisable (registre général/structurel).** Un comparatif documentaire général
(historique 2016/2017, mécanismes, vitesse/mémoire) confirme cette thèse : *le choix influence souvent
moins les performances que le feature engineering, la validation, le réglage et la calibration ; deux
modèles bien optimisés sont très proches ; le choix se fait sur les contraintes de calcul et de
déploiement.* Deux points de ce registre s'appliquent chez nous : l'avantage **vitesse/mémoire sur
gros volumes** (Home Credit = 307 511 obs → a concrètement accéléré la recherche d'hyperparamètres) ;
et le fait qu'**aucun des deux modèles n'est naturellement calibré** → corrobore la nécessité de la
recalibration (BK.1).

**Deux pièges à mettre en quarantaine :**
- Les chiffres génériques de la littérature (type « LightGBM 0,812 vs XGBoost 0,810 ») **ne sont PAS
  nos données**. Chez nous, c'est l'inverse (XGBoost 0,7585 vs 0,7575). On ne mélange jamais le
  registre *général* et le registre *local* : notre résultat mesuré (équivalence, XGBoost marginalement
  devant) reste la vérité locale.
- La *robustesse au surapprentissage* est un léger avantage **de XGBoost** (croissance level-wise plus
  conservatrice). Ne jamais l'invoquer comme argument *pro-LightGBM*. Notre stabilité val→test ≤ 0,008
  montre de toute façon qu'il n'y a pas de surapprentissage d'un côté ni de l'autre → non
  différenciateur ici.

---

## 6. Focus — Les seuils de décision (règle d'Elkan)

**PD et PDO sont la même information, deux affichages.** La formule (type A, inchangée) est une
bijection monotone :

```
Score = 515,06 − 28,85 × ln( PD / (1 − PD) )
```

Équivalences du Jeu 2 retenu :

| PD | Score PDO | Rôle |
|---|---|---|
| 5 % | 600 | ancrage (vérifie la formule) |
| 10 % | ≈ 578 | frontière ACCORDÉ |
| 30 % | ≈ 540 | frontière REFUSÉ |

→ On **raisonne** la décision en PD (parlant pour une politique d'octroi, espace où travaille Elkan),
on l'**affiche** en PDO (score 300–850, lisible pour l'agent).

**La règle d'Elkan (2001).** Les deux erreurs n'ont pas le même coût. On ne minimise donc pas le
*taux d'erreur* mais le *coût attendu*. Soit `C_FN` = coût d'accepter un client qui fait défaut (perte
du capital) et `C_FP` = coût de refuser un bon client (manque à gagner). Pour un client de probabilité
calibrée `p` : refuser coûte en espérance `(1−p)·C_FP`, accepter coûte `p·C_FN`. On refuse dès que
refuser coûte moins qu'accepter, soit `(1−p)·C_FP ≤ p·C_FN`. En résolvant :

```
T* = C_FP / (C_FP + C_FN)
```

La formule est **universelle** ; seuls les coûts changent d'un contexte à l'autre. Intuition : si un
défaut coûte 5× un refus abusif (`C_FN = 5·C_FP`), alors `T* = 1/6 ≈ 16,7 %` — plus le défaut est cher
relativement, plus le seuil descend (on devient prudent). Pour **trois** bandes
(ACCORDÉ/REVUE/REFUSÉ), on applique le même principe avec deux ratios de coûts (frontière basse et
haute). Le seuil 0,5 n'est optimal *que* si `C_FP = C_FN` — quasi jamais le cas en banque.

**Pourquoi on ne l'a PAS appliquée (et pourquoi c'est rigoureux quand même) :**
1. Elkan exige les **vrais coûts monétaires** `C_FP`, `C_FN` (marge, montant moyen, taux de
   recouvrement). Home Credit est un **proxy** : ces coûts n'existent pas. Les inventer pour produire
   un « optimum » serait de la **fausse rigueur** — plus faible, devant un jury, qu'une hypothèse
   assumée.
2. Elkan exige des **probabilités calibrées** — exactement ce que la recalibration isotonique (BK.1) a
   produit. On n'a donc pas sauté la rigueur : on a **posé le socle** (calibration) et **nommé la
   méthode**, en ne différant que la partie qui exige de vraies données métier.

**Ce que l'on a fait à la place (Niveau III).** Comparé **5 jeux de seuils en PD** sur le jeu de test,
sur trois critères (volume de revue gérable, taux de défaut minimal chez les ACCORDÉS, risque croissant
par bande) → **Jeu 2 (PD<10 % / PD>30 %)** retenu comme meilleur compromis. Statut : **hypothèse de
travail explicite**.

**Récit imparable pour l'oral :** *« Je ne fige pas un seuil magique. Ma recalibration rend les
probabilités justes, ce qui est le pré-requis d'Elkan (2001). Sur le proxy, faute de coûts réels, je
choisis un jeu de seuils raisonnable que je nomme comme hypothèse de travail ; sur des données réelles,
on injecte les vrais coûts et la même formule donne le seuil adapté. »*

---

## 7. Focus — ρc : comment le prouver (partition risque-couverture)

**Les deux métriques de calibration à connaître.**
- **Score de Brier (Brier 1950)** : erreur quadratique moyenne entre proba annoncée et réalité,
  `Brier = (1/N) Σ (p_i − y_i)²`, entre 0 (parfait) et 1. Il **punit la confiance mal placée**
  (annoncer 0,9 pour un bon client coûte 0,81). Chez nous : 0,216 avant recalibration → ~0,083 après.
- **ECE (Expected Calibration Error, Guo et al. 2017)** : on range les clients en paquets par proba
  prédite ; dans chaque paquet, écart entre « proba moyenne annoncée » et « taux de défaut réel » ;
  puis moyenne. 0 = parfait. Le Brier mêle calibration *et* finesse ; l'ECE **isole** la calibration.
  Chez nous : 0,34 → <0,01 après recalibration.

**La preuve par partition — pourquoi.** ρc prétend mesurer la **fiabilité** d'un score. Si c'est vrai,
les scores à **ρc faible** doivent être **moins fiables** = le modèle doit y être **moins performant**.
Une ablation classique ne verra jamais ça (ρc ne touche ni AUC ni Gini). Il faut une **évaluation
stratifiée**.

**La preuve par partition — comment.**
1. Sur le jeu de **test** (labels connus), calculer ρc pour chaque client.
2. Découper en **tranches de ρc** alignées sur les seuils opérationnels : `ρc < 0,25` /
   `0,25 ≤ ρc < 0,40` / `ρc ≥ 0,40`.
3. Dans **chaque** tranche, mesurer l'**AUC** (discrimination) et le **Brier/ECE** (calibration).
4. **Résultat attendu si ρc est valide :** dégradation **monotone** quand ρc baisse (tranche haute ≈
   AUC globale ~0,75 + bonne calibration ; tranche basse = AUC nettement plus faible + calibration
   dégradée). Une performance **plate** entre tranches invaliderait ρc → le bloc échouerait sa propre
   preuve. C'est cette falsifiabilité qui rend l'argument crédible.

**Cadre théorique et références.** On valide une mesure de confiance par une **analyse
risque-couverture** (n'accepter que les prédictions sûres → le risque baisse) : c'est la
**classification sélective / option de rejet**.
- **Chow (1970)**, *On optimum recognition error and reject tradeoff*, IEEE Trans. Information Theory
  — fondateur de l'option de rejet. `[À VÉRIFIER]`
- **El-Yaniv & Wiener (2010)**, *On the foundations of noise-free selective classification*, JMLR —
  courbe risque-couverture moderne. `[À VÉRIFIER]`

**Deux points de vigilance (reviewer).**
- Le lien ρc-bas ↔ moins fiable **n'est pas un biais** : un ρc bas = dossier mince = moins de features
  = intrinsèquement plus dur à scorer. C'est *exactement* ce que ρc est censé signaler. Formuler comme
  une **association** (« quand ρc est bas, fais moins confiance au score »), pas une causalité.
- **Taille d'échantillon de la tranche basse.** Home Credit est majoritairement « fully-banked » : peu
  de clients test auront ρc < 0,25 → l'AUC de cette tranche sera **bruitée**. Reporter le **n par
  tranche** et signaler honnêtement si la tranche basse est trop petite pour une AUC stable.

---

## 7-bis. Reproductibilité & sauvegarde des artefacts (session Quantification, run v3)

**Contexte.** L'audit du notebook dupliqué (`AUDIT_NOTEBOOK_CREDIX.md`) a révélé deux points de
méthode à acter, tous deux liés à la **traçabilité vers la production** (contrainte dure de la
hiérarchie des objectifs).

**(1) La calibration doit être un artefact, pas un calcul volatil.** La recalibration isotonique
(BK.1) était ré-apprise à la volée dans le notebook puis jetée. Or `lgbm_final.pkl` seul renvoie des
PD **gonflées** (~43 %) : sans l'objet isotonique sauvegardé, le backend ne peut pas reproduire la
PD juste (~9 %), et tout le bénéfice de BK.1 est perdu. **Décision :** l'objet `IsotonicRegression`
est appris sur la validation puis **sauvegardé** (`isotonic_calibrator.pkl`, cellule 12.0a). La chaîne
d'inférence Flux A est désormais explicite et versionnée :
`X → WOE → NAP → LightGBM.predict_proba → isotonic → PD → PDO → décision`. *(Niveau I — vérifié :
proba 43,47 % → 9,28 % sur test ; AUC préservée, |Δ| = 0,0005.)*

**(2) Les seuils de décision sont une source de vérité unique.** Les frontières (Jeu 2 : PD 10 %/30 %)
et les paramètres PDO (offset/factor) étaient recopiés en dur dans plusieurs cellules — cause directe
des divergences de chiffres constatées entre documents. **Décision :** centraliser dans un
`decision_config.json` (cellule 12.0b), lu à l'identique par le notebook et le backend.

**(3) La reproductibilité impose de figer l'environnement.** Constat empirique fort de cette session :
en ré-exécutant le pipeline sur une **image Kaggle plus récente**, les métriques de discrimination
sont restées quasi identiques (bruit < 0,002, cf. `RAPPORT_RESULTATS §1`) **mais la répartition des
décisions a bougé de 1 à 2,5 points** (Jeu 2 : 65,9/31,1/3,0 → **67,3/28,6/4,0**). Explication : une
métrique de **classement** (AUC) est robuste à un micro-changement de modèle, alors qu'un **seuil**
posé sur une zone dense de la distribution des PD **amplifie** ce micro-changement en un basculement
de population. C'est une illustration directe de la distinction *classement robuste / valeur absolue
sensible* déjà posée en réserve permanente. **Décision :** (a) le run `CREDIX_v3` devient la
**référence canonique** (les chiffres d'images antérieures, non reproductibles, ne sont plus cités) ;
(b) les versions (`protobuf`, `lightgbm`, `scikit-learn`) seront **épinglées** en Section 0 au
nettoyage final, pour garantir l'identité entre le mémoire et la démonstration de soutenance ; (c) les
trois artefacts backend (`lgbm_final.pkl`, `isotonic_calibrator.pkl`, `decision_config.json`) étant
issus du **même run**, ils sont mutuellement cohérents et devront être **régénérés ensemble** en cas
de re-run. *(Cet épisode est aussi un argument méthodologique positif pour le mémoire : il matérialise
pourquoi le versioning strict fait partie intégrante d'un pipeline de scoring industrialisable.)*

**Niveau de preuve.** (1) et (2) = Niveau I (vérifiés sur v3). (3) = Niveau I pour le constat de
dérive ; la décision de figer relève de la bonne pratique d'ingénierie (traçabilité, contrainte dure).

---

## 7-ter. Phase 1.1 — pourquoi on a dû adapter le découpage en tranches de ρc

**Le problème rencontré.** Les seuils opérationnels de ρc (< 0,25 / 0,25–0,40 / ≥ 0,40) viennent de
la conception (0,25 = seuil de désactivation du Flux B ; 0,40 = seuil « revue obligatoire » illustré
en Section 10). Ce ne sont **pas** des seuils calculés sur un échantillon — ils sont fixés par choix
métier, en amont de toute mesure.

Or les chiffres déjà obtenus dans le notebook (Section 10, échantillon de 1 000 clients validation)
montrent que **ρc minimum observé = 0,4722**. Aucun client, même le plus incomplet, ne descend sous
0,47. Le dataset Home Credit est trop « fully-banked » (clientèle bien renseignée) pour produire des
dossiers vraiment minces. Avec les seuils officiels, les deux premières tranches (< 0,25 et
0,25–0,40) seraient **vides** — impossible de calculer un AUC sur zéro client.

**Décision actée (Niveau III — hypothèse de travail, adaptation méthodologique documentée).**
On calcule d'abord les tranches avec les seuils officiels. Si une tranche a moins de 30 clients
(seuil de taille minimal pour qu'un AUC soit interprétable), on **bascule automatiquement** sur un
découpage en **tiers** (les 33% de ρc les plus bas / les 33% du milieu / les 33% les plus hauts du
jeu de test). Le mode de découpage effectivement utilisé est **affiché explicitement** dans les
résultats — jamais caché.

**Pourquoi c'est défendable au jury.** On ne force pas des seuils irréalistes sur un proxy qui ne
les atteint pas. On démontre la même logique (dégradation monotone de la performance quand la
couverture d'information baisse) avec un découpage **adapté à la distribution réelle des données**,
et on documente honnêtement que les seuils opérationnels (0,25/0,40) prennent tout leur sens sur une
population avec plus de dossiers minces que Home Credit — ce qui est une limite du proxy, pas une
faiblesse de ρc.

---

## 7-quater. Extension Phase 1.2 — vérifier que le Flux B ne confond pas « dossier incomplet » et « client suspect »

**Le risque identifié (question soulevée en session).** Le Flux B (autoencodeur, AE) apprend à
reconnaître des profils « normaux » sur le train. Un client avec un dossier incomplet (ρc faible)
est, par nature, rare dans les données d'entraînement — pas parce qu'il est suspect, mais simplement
parce qu'il manque des informations. Le risque : l'AE pourrait signaler ces clients comme
« anomalie » uniquement parce qu'ils sont rares dans les données, pas parce qu'ils sont réellement
atypiques ou frauduleux. Cela reviendrait à **pénaliser l'incomplétude du dossier au lieu de la
juger séparément** — une confusion méthodologique à éviter absolument dans un système de scoring
régulé.

**Le garde-fou déjà en place.** L'architecture désactive déjà le Flux B en dessous de ρc = 0,25 (cf.
note mémoire n°3) — donc le cas extrême (dossier quasiment vide) est déjà couvert : l'AE ne se
prononce jamais dessus.

**Ce qui reste une simple supposition, pas une preuve.** Entre ρc = 0,25 et un dossier bien rempli,
on **suppose** que le préprocessing de l'AE (remplacement des valeurs manquantes par la médiane du
train, dans `scaler_if.pkl`) protège contre ce biais : un client avec des trous remplis par des
valeurs « moyennes » devrait ressembler à un profil banal aux yeux de l'AE, pas à une anomalie.
**Mais ce raisonnement n'a jamais été vérifié sur les vrais clients du test.** Une hypothèse non
vérifiée ne doit jamais être présentée comme un fait en soutenance.

**Test ajouté (à faire en Phase 1.2, en même temps que le test « ACCORDÉ+anomalie » vs « ACCORDÉ
sain »).** Sur le test, dans la zone où le Flux B est actif (ρc ≥ 0,25) :
1. Séparer les clients en deux groupes selon leur ρc : **Groupe A** (ρc plutôt bas, dossier plus
   incomplet) et **Groupe B** (ρc plutôt haut, dossier plus complet).
2. Dans chaque groupe, mesurer le **taux de clients signalés « anomalie »** par l'AE (aux deux
   seuils P95 et P99 déjà retenus pour le Flux B).
3. **Interprétation :**
   - Si le Groupe A a un taux de signalement **nettement plus élevé** que le Groupe B → le risque
     est confirmé : l'AE confond dossier incomplet et profil suspect. Il faudra le documenter comme
     limite honnête du système, et envisager de relever le seuil de désactivation (0,25 → plus haut).
   - Si les deux groupes ont un taux **comparable** → le mécanisme de remplacement par la médiane
     protège bien le système. On pourra l'affirmer avec un chiffre à l'appui, pas seulement par
     hypothèse.

**Niveau de preuve.** III avant le test (hypothèse assumée, non vérifiée) → I après le test (mesuré
empiriquement sur le jeu de test).

---

## 7-quinquies. Phase 1.2 — le test du Flux B intégré (angle mort sur dossiers incomplets)

**Prérequis technique (nouveauté).** Le notebook n'a jamais fait passer le Flux B sur le **test**
(seulement train/val en Section 11). La Phase 1.2 fait tourner, pour la première fois, la chaîne du
Flux B (préprocessing 61 dims via `scaler_if.pkl` + `encoder_hybrid.pkl` → `autoencoder.keras` →
erreur de reconstruction `log1p(MSE)` → flag anomalie aux seuils P95/P99) sur les 46 128 clients du
test.

**Origine du seuil d'anomalie (point de méthode important).** Le seuil (P95/P99) n'est PAS recalculé
en Phase 1.2 : il est **chargé depuis `ae_metadata.json`** (`seuil_ae_p95`, `seuil_ae_p99`), où il a
été sauvegardé en Section 11. Ce seuil a été calibré sur les **jeux d'injection synthétiques**, en
échelle `log1p(MSE)` — de façon **strictement non supervisée** (jamais de recours à TARGET). C'est
délibéré : le Flux B détecte l'**anomalie structurelle**, pas le **défaut**. Défaut ≠ anomalie.

**Test « défaut chez ACCORDÉ + anomalie » — ÉCARTÉ (et pourquoi).** Un test initialement prévu
mesurait le taux de défaut réel des clients « ACCORDÉ + anomalie » vs « ACCORDÉ + sain ». Il a été
**retiré** : il reviendrait à mesurer un lien anomalie → défaut qu'on sait **hors-sujet par
construction** (anomalie ≠ défaut, principe fondateur de l'architecture à deux flux). La valeur du
Flux B est déjà établie **autrement** : par l'injection synthétique (Section 11), qui prouve qu'il
détecte les profils atypiques (AE 8/9 victoires). Re-tester le défaut ne prouverait rien et
brouillerait le message. *(Trace conservée ici pour ne pas refaire l'erreur.)*

**Test conservé — le Flux B pénalise-t-il les dossiers incomplets ? (cf. §7-quater).**
- *Logique.* Risque soulevé : l'AE pourrait signaler les dossiers incomplets (ρc bas) comme
  anomalies simplement parce qu'ils sont rares dans le train.
- *Protocole (option 2 — mêmes terciles de ρc que la Phase 1.1).* Dans la zone où le Flux B est
  actif (ρc ≥ 0,25), comparer le **taux de signalement anomalie** (P95/P99) entre terciles bas/moyen/
  haut de ρc.
- *Résultat (run v3, test).* Voir `RAPPORT_RESULTATS §9`. **L'inquiétude est levée** : les dossiers
  incomplets ne sont PAS sur-signalés — ce sont même les dossiers **complets** (T3) qui le sont le
  plus (P95 : T1 4,07 % / T2 4,18 % / T3 9,22 %).
- *Lecture CRITIQUE (ne PAS présenter comme une victoire).* Cette absence de sur-signalement découle
  du **remplacement des valeurs manquantes par la médiane du train** : un dossier troué est
  « maquillé » en profil moyen, donc reconstruit facilement par l'AE, donc peu signalé. La médiane
  n'est **pas une vraie valeur du client** — c'est une valeur inventée. La conséquence est un **angle
  mort** : sur un dossier très incomplet, le Flux B perd son pouvoir de détection (il ne peut pas
  juger ce qu'il ne voit pas). Un profil atypique — voire frauduleux — dont l'atypie se logerait dans
  les variables manquantes passerait sous le radar.
- *Ce que ce résultat justifie.* C'est **précisément** le rôle du garde-fou **ρc < 0,25**
  (désactivation du Flux B + revue humaine forcée) : en dessous d'un certain niveau d'information, on
  ne fait plus confiance au détecteur. Le résultat **justifie a posteriori** ce garde-fou et invite à
  **vérifier que le seuil 0,25 est bien placé** (perspective : tester à quel ρc l'angle mort devient
  critique).
- *Réserve du proxy.* ρc min = 0,3918 sur le test → aucun vrai thin-file testé. L'angle mort est ici
  **raisonné, pas mesuré à l'extrême** ; à quantifier sur données réelles à forte proportion de
  dossiers minces.

**Niveau de preuve.** Test conservé : I (mesuré sur le test) pour le constat + III (bonne pratique
d'ingénierie) pour la lecture « angle mort → garde-fou ρc ». Passage de III (hypothèse §7-quater) à I
pour la question du biais.

---

## 7-sexies. Phase 2 (ex-3) — la PLACE des filtres univarié & multivarié (thèse à démontrer)

**Décision 30/07 : abandon de l'ablation V0→V6.** Trois des cinq blocs visés (WOE, scale_pos_weight,
isotonic) sont déjà démontrés (Tâche 6, BK.1). Ré-ablater serait redondant et la modularisation
complète (7 versions configurables + cache) coûte trop pour une valeur seulement pédagogique. On la
remplace par le seul trou réel : **la légitimité des deux étapes de filtrage**.

**La thèse (fil directeur « chaque bloc sert un objectif »).** On ne cherche PAS à couronner un outil
(« IV meilleur que MI »). On démontre que **deux fonctions distinctes** ont chacune leur place :

- **Filtre univarié (IV)** — objectif **parcimonie / auditabilité**. Regarde chaque variable *seule* :
  a-t-elle un lien avec le défaut à elle seule ? Élimine tôt le bruit évident. Rapide, lisible, seuil
  documenté (Siddiqi 2006). Ne voit pas les relations entre variables — ce n'est pas son rôle.
- **Filtre multivarié (NAP)** — objectif **stabilité / anti-redondance**. Regarde chaque variable *en
  présence des autres* : apporte-t-elle encore quelque chose une fois les autres présentes ? Traque la
  redondance qu'un critère univarié ne peut pas voir (deux variables à bon IV peuvent dire la même
  chose). Complémentaire, pas concurrent.

**Ce que les tests démontrent (méthode = Option 1, comparaison légère) :**
1. *Robustesse de l'étape univariée* — IV vs MI : si deux filtres univariés sélectionnent ~les mêmes
   variables (fort recoupement, AUC comparables), l'étape univariée est un **rôle structurel**, pas un
   caprice de l'IV. N'importe quel filtre univarié raisonnable jouerait ce rôle.
2. *Robustesse de l'étape multivariée* — NAP vs VIF : deux approches multivariées traitent la
   redondance de façon cohérente → l'étape multivariée a aussi un rôle structurel.
3. *Complémentarité* — l'univarié et le multivarié ne coupent PAS les mêmes variables → pas de double
   emploi ; chacun sa place, chacun son objectif.

**Message pour l'oral.** « Le pipeline a deux étages de filtrage parce qu'ils répondent à deux
questions différentes : *cette variable a-t-elle un signal seule ?* (univarié) et *apporte-t-elle
quelque chose de non redondant une fois les autres présentes ?* (multivarié). Le choix de l'outil
précis (IV, MI, NAP, VIF) est secondaire — c'est le rôle qui compte, et il est robuste. »

**Niveau de preuve.** I (mesuré : recoupements + AUC + VIF) pour la robustesse ; le cadre « deux
objectifs » est de Niveau II (littérature scorecard + sélection de variables). Cas B léger.

---

## 8. Références (à consolider pour le .bib)

- Brier, G. W. (1950). *Verification of forecasts expressed in terms of probability.* Monthly Weather
  Review, 78(1), 1–3.
- Breunig, M. M., Kriegel, H.-P., Ng, R. T., & Sander, J. (2000). *LOF: Identifying density-based local
  outliers.* ACM SIGMOD.
- Chen, T., & Guestrin, C. (2016). *XGBoost: A scalable tree boosting system.* ACM SIGKDD.
- Chow, C. K. (1970). *On optimum recognition error and reject tradeoff.* IEEE Trans. Information
  Theory. `[À VÉRIFIER]`
- El-Yaniv, R., & Wiener, Y. (2010). *On the foundations of noise-free selective classification.* JMLR.
  `[À VÉRIFIER]`
- Elkan, C. (2001). *The foundations of cost-sensitive learning.* IJCAI.
- Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017). *On calibration of modern neural networks.*
  ICML.
- Ke, G., et al. (2017). *LightGBM: A highly efficient gradient boosting decision tree.* NeurIPS.
- Liu, F. T., Ting, K. M., & Zhou, Z.-H. (2008). *Isolation forest.* IEEE ICDM.
- Niculescu-Mizil, A., & Caruana, R. (2005). *Predicting good probabilities with supervised learning.*
  ICML.
- Siddiqi, N. (2006). *Credit Risk Scorecards.* Wiley.
- Zadrozny, B., & Elkan, C. (2002). *Transforming classifier scores into accurate multiclass
  probability estimates.* ACM SIGKDD. *(recalibration isotonique)*

---

*Document au fil de l'eau — à compléter à chaque décision méthodologique nouvelle. Dernière mise à
jour : session « Phase 1 » (30/07, run CREDIX_v3) — Phase 1 close (§7-ter, 7-quater, 7-quinquies) +
recadrage Phase 2 sur la place des filtres (§7-sexies). Prochain jalon : Phase 2 (délégué à Claude
Code — préparation des cellules 12.3+).*
