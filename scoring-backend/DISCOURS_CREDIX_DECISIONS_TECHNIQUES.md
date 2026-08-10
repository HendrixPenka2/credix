# Discours — CREDIX Rapport de Décisions Techniques
> Singhe Penka Hendrix Donavan — 21P050 — ENSPY GI2026
> À lire slide par slide lors de la présentation

---

## SLIDE 1 — Page de titre

"Bonjour. Je vais vous présenter le rapport de décisions techniques du projet CREDIX — un système de scoring de risque de crédit par machine learning développé pour IT Nearshore.

Ce rapport répond directement aux quatre questions posées par l'encadrant académique lors de notre dernière réunion. Chaque décision que je vais vous présenter est justifiée par des expérimentations traçables sur le dataset Home Credit Default Risk — 307 511 observations réelles avec un taux de défaut de 8,07 %.

Je n'ai pas retenu des algorithmes parce qu'ils sont populaires. Je les ai testés, comparés, et j'ai éliminé ceux qui ne résistaient pas aux contraintes métier, architecturales, ou réglementaires du projet."

---

## SLIDE 2 — 4 Questions, 4 Réponses

"Ce tableau synthétise les quatre questions et leurs réponses en une ligne. Je vais détailler chacune dans les sections suivantes.

Deux points importants à noter avant de commencer :

Premièrement, pour Q1 sur les autoencodeurs — je vais vous montrer que la situation a évolué depuis la rédaction initiale de ce rapport. L'élimination originale était basée sur une erreur méthodologique que j'ai identifiée et corrigée.

Deuxièmement, toutes les décisions sont indépendantes. La réponse à Q4 sur LightGBM ne dépend pas de Q1. Chaque section peut être évaluée séparément."

---

## SLIDE 3 — Section 1 : Gestion du Déséquilibre

"La section 1 répond aux questions Q2 et Q3 — le sous-échantillonnage et SMOTE. Ces deux techniques ont été proposées comme alternatives à notre approche actuelle.

Je vais vous montrer pourquoi les deux ont été éliminées, mais pour des raisons fondamentalement différentes : l'une par les résultats expérimentaux, l'autre par une incompatibilité architecturale antérieure aux performances."

---

## SLIDE 4 — Le Déséquilibre 92/8

"Le point de départ est ce déséquilibre : 92 % de bons payeurs, 8 % de défauts. Cela représente 282 686 clients solvables contre seulement 24 825 défaillants.

Ce déséquilibre crée un piège classique : un modèle naïf qui prédit 'bon payeur' pour absolument tout le monde obtient 92 % d'accuracy. Mais il ne détecte aucun défaut. En credit scoring, un défaut non détecté est une perte financière directe pour la banque.

C'est pourquoi nous avons établi une hiérarchie claire des métriques : le Recall d'abord — proportion de vrais défauts identifiés — puis l'AUC pour la comparaison réglementaire, puis la Précision et le F1 comme métriques opérationnelles.

Toute la suite de l'évaluation est fondée sur ces métriques, pas sur l'accuracy."

---

## SLIDE 5 — SMOTE : Rejet Architectural

"SMOTE a été rejeté non pas parce qu'il produit de mauvais résultats, mais parce qu'il est architecturalement incompatible avec notre pipeline WOE. C'est une distinction importante.

SMOTE génère des clients fictifs par interpolation linéaire entre deux clients réels. Le problème surgit à deux endroits précis dans notre pipeline.

Premier cas : si on applique SMOTE avant le WOE — le WOE a besoin de bins calibrés sur des distributions réelles. Un type de contrat 'entre Cash loans et Revolving loans' n'existe pas. Le WOE ne sait pas l'encoder. On entraînerait le modèle sur des données invalides.

Second cas : si on applique SMOTE après le WOE — les valeurs WOE sont des log-odds calculés sur des bins précis. Interpoler WOE(-0.43) et WOE(+0.21) produit WOE(-0.11), une valeur hors de tout bin calibré, sans signification statistique.

Il y a également un argument réglementaire : Bâle II exige que les modèles de scoring soient entraînés sur des données réelles. Des clients fictifs ne sont pas défendables devant un auditeur bancaire, quelle que soit la performance.

La décision de rejet est donc architecturale et réglementaire. Elle ne dépend pas des performances."

---

## SLIDE 6 — Résultats : scale_pos_weight Retenu

"Nous avons testé quatre configurations pour gérer le déséquilibre.

La baseline — Config 1 — produit un Recall de 2,6 %. Cela signifie que 97,4 % des défauts passent inaperçus. Sans gestion du déséquilibre, tout système de scoring est inopérant.

La configuration retenue est scale_pos_weight égal à 11,4, soit le ratio 282 686 divisé par 24 825. L'AUC est quasi-identique à la baseline — 0,7578 contre 0,7577 — mais le Recall passe à 72,8 %. Le modèle détecte maintenant les trois quarts des défauts réels.

Le sous-échantillonnage — Config 4 — obtient un Recall légèrement supérieur de 76,6 %, mais au prix de la suppression de 183 631 observations réelles. L'AUC descend à 0,7539. La généralisation est dégradée sur des données que le modèle n'a jamais vues.

La décision est claire : scale_pos_weight ne modifie aucune donnée. Il pondère uniquement la fonction de perte interne de LightGBM. Toutes les observations réelles sont conservées. Conforme Bâle II."

---

## SLIDE 7 — Section 2 : Détection Zero-Day

"La section 2 répond à Q1 sur les autoencodeurs et présente la contribution originale du projet : la détection de profils zero-day.

Je vais d'abord expliquer le concept, puis présenter l'étude comparative entre les trois algorithmes candidats, et enfin vous expliquer pourquoi la situation a évolué depuis la première version de ce rapport."

---

## SLIDE 8 — Zero-Day : 3e Dimension

"Le système CREDIX repose sur deux mécanismes déjà en place.

Le premier est ρc — l'indice de couverture prédictive. Il mesure si nous avons assez d'information sur ce client spécifique. Si ρc est inférieur à 0,25, une revue manuelle est déclenchée indépendamment du score.

Le second est LightGBM, qui répond à la question 'ce client va-t-il faire défaut' en produisant un score PDO entre 300 et 850.

Mais il existe une troisième question que ces deux mécanismes ne posent pas : 'ce profil ressemble-t-il aux profils que le modèle a vus pendant l'entraînement ?'

Un client peut avoir un dossier complet — ρc élevé — et obtenir un score LightGBM. Mais si son profil est structurellement impossible ou n'a jamais été observé parmi les 199 444 bons payeurs d'entraînement, LightGBM extrapole hors distribution sans pouvoir le signaler.

C'est la dimension zero-day — complémentaire et indépendante des deux autres."

---

## SLIDE 9 — Exemple Concret

"L'exemple illustre ce mécanisme. Un client de 25 ans avec 22 ans d'ancienneté professionnelle. Ce profil est mathématiquement impossible — on ne peut pas avoir travaillé 22 ans si on a 25 ans.

ρc : élevé. Toutes les 27 features sont présentes. Le dossier est complet. ρc ne détecte rien.

LightGBM : produit un score. Il extrapole ce profil en se basant sur des clients similaires dans le dataset, sans signaler l'incohérence structurelle.

L'algorithme de détection d'anomalie — qu'il s'agisse de l'Isolation Forest ou de l'Autoencoder — détecterait l'anomalie parce qu'aucun profil similaire n'existe parmi les 199 444 bons payeurs d'entraînement.

La corrélation entre le score d'anomalie et le score LightGBM est de 0,11 sur nos données. Cela confirme que les deux mécanismes captent des dimensions réellement indépendantes — l'un ne remplace pas l'autre."

---

## SLIDE 10 — Étude Comparative : IF vs AE vs LOF

"Trois algorithmes ont été évalués pour la détection zero-day.

LOF — Local Outlier Factor — a été éliminé en premier. Sa latence est en O(N_train) : à chaque inférence, il compare le nouveau client aux 199 444 bons payeurs en mémoire. Trop lent pour une intégration temps réel. Éliminé.

**Ici je dois être transparent sur l'évolution de ce rapport.**

La première version indiquait que l'Autoencoder Keras avait été éliminé pour distribution dégénérée — les scores MSE bruts étaient tous proches de zéro, rendant la calibration d'un seuil impossible.

Cette élimination était basée sur une erreur méthodologique. Nous utilisions une normalisation min-max sur la MSE brute. Or, quand les erreurs de reconstruction sont toutes de l'ordre de 0,001 à 0,01 — ce qui est normal pour un AE bien entraîné — la normalisation min-max compresse tout en quelques millièmes. La distribution semble dégénérée alors qu'elle ne l'est pas.

La correction : utiliser log1p de la MSE — c'est-à-dire log(1 + MSE) — qui étale la distribution naturellement sans dépendre d'un maximum arbitraire. Une fois appliquée, la calibration du seuil devient parfaitement possible.

Avec cette correction, la comparaison finale est la suivante :
- Isolation Forest : AUC 0,5554, corrélation PD 0,1088
- Autoencoder Keras : AUC 0,5595, corrélation PD 0,0776

Les deux algorithmes sont viables. La décision finale entre eux a nécessité une analyse au-delà des métriques."

---

## SLIDE 11 — Section 3 : LightGBM

"La section 3 répond à Q4 — LightGBM peut-il maximiser la détection de motifs complexes ?

Je vais d'abord vous montrer les résultats sur 5 modèles candidats, puis expliquer pourquoi la décision entre LightGBM et XGBoost ne pouvait pas se prendre sur les métriques seules."

---

## SLIDE 12 — Élimination Progressive des Candidats

"Cinq modèles ont été évalués.

La Régression Logistique modélise des relations linéaires entre features. Le comportement de défaut en crédit est hautement non-linéaire — combinaisons de revenu, ancienneté, historique de paiement. AUC inférieur, éliminée.

Random Forest traite tous les exemples à égalité. Avec 8 % de défauts, il concentre son apprentissage sur la masse des bons payeurs. AUC inférieur, éliminé.

Gradient Boosting n'a pas de mécanisme équivalent à scale_pos_weight. Son Recall de 2,9 % confirme l'échec sans gestion du déséquilibre. Éliminé.

Il reste LightGBM et XGBoost — les deux finalistes avec des métriques quasi-identiques."

---

## SLIDE 13 — LightGBM vs XGBoost

"Les métriques sont quasi-identiques. AUC : 0,7571 contre 0,7580 — écart de 0,0009, non significatif statistiquement. Gini, KS, Recall, F1 — même constat. Aucune différence n'est statistiquement significative.

Quand deux modèles produisent des performances identiques, les métriques ne peuvent pas trancher. Il faut analyser comment chaque modèle obtient ces résultats — les différences architecturales internes deviennent décisives.

C'est ce que les trois slides suivants démontrent."

---

## SLIDE 14 — 3 Arguments Architecturaux Décisifs

"Trois arguments architecturaux, indépendants les uns des autres.

**Premier argument — GOSS.** Pendant l'entraînement, LightGBM calcule le gradient de chaque observation. Les clients défaillants difficiles à classer reçoivent un gradient élevé. GOSS conserve systématiquement ces cas difficiles et sous-échantillonne uniquement les cas déjà bien classés. LightGBM consacre structurellement plus d'effort aux 24 825 défauts. C'est une réponse directe à la question sur la détection de motifs complexes minoritaires.

XGBoost n'a pas de mécanisme équivalent — il traite tous les exemples selon leur gradient sans concentration préférentielle.

**Deuxième argument — Leaf-wise.** XGBoost fait croître ses arbres niveau par niveau, uniformément. LightGBM choisit toujours la feuille qui réduit le plus l'erreur globale, quelle que soit la profondeur.

En crédit concret : un défaut lié à la combinaison 'client jeune + revenu instable + retards importants + fort endettement revolving' nécessite de creuser profondément cette branche spécifique. LightGBM y va directement. XGBoost construit d'abord tous les autres niveaux.

**Troisième argument — Benchmark Kaggle.** Home Credit Default Risk est issu d'une compétition Kaggle 2018. Sur des centaines d'équipes indépendantes, les solutions les mieux classées utilisent majoritairement LightGBM. Ce consensus empirique constitue une validation externe objective — indépendante de nos propres expérimentations sur ce même dataset.

Ces trois arguments sont indépendants. Si l'un était contesté, les deux autres maintiendraient la décision."

---

## SLIDE 15 — Arguments Secondaires

"Quatre arguments complémentaires renforcent la décision sans être décisifs seuls.

TreeSHAP : LightGBM est nativement compatible avec les explications SHAP exactes et déterministes. C'est une exigence réglementaire Bâle II Pilier 3 et RGPD Article 22 — chaque décision de crédit doit être explicable au client. XGBoost l'est aussi, mais LightGBM l'intègre de manière plus native.

Réentraînement mensuel : LightGBM est 3 à 5 fois plus rapide que XGBoost en entraînement sur 215 257 observations. Cela n'affecte pas le scoring — les deux sont inférieurs à 2 ms — mais impacte les cycles de maintenance mensuels.

CatBoost : son avantage principal est l'encodage natif des variables catégorielles. Notre WOE déjà en place couvre exactement cette fonction. Superposer CatBoost serait un double encodage redondant et potentiellement contradictoire.

Réseaux de neurones : ils peuvent scorer, mais ne peuvent pas produire des explications individuelles déterministes. C'est une exclusion réglementaire Bâle II, indépendante des performances."

---

## SLIDE 16 — Évolutions Implémentées

"Ce slide présentait les évolutions à implémenter. Je suis en mesure de vous confirmer que ces cinq évolutions ont toutes été réalisées.

Le prétraitement Flux B — StandardScaler pour les features numériques, FrequencyEncoder pour les catégorielles — est en production, entraîné sur les 199 444 bons payeurs.

L'Isolation Forest n'est plus 'à intégrer' — il est en production comme modèle de fallback.

L'intégration FastAPI est complète. À chaque scoring, le score d'anomalie est calculé en parallèle du flux LightGBM et inclus dans la réponse JSON.

La règle d'escalade est active : anomalie détectée sur un profil ACCORDÉ → REVUE MANUELLE automatique.

Les collections MongoDB ont été étendues : anomaly_score, is_anomaly, et if_escalade sont tracés dans les collections demandes, décisions, et audit_logs.

**Point important :** l'algorithme de détection a évolué depuis la rédaction initiale. Suite à la correction de l'erreur méthodologique sur l'Autoencoder, l'AE est maintenant le modèle principal, avec l'IF en fallback. Je vous explique ce choix dans les deux slides suivants."

---

## SLIDE 17 — Avancement Mémoire

"Le mémoire est en cours de rédaction. L'introduction couvre le contexte du scoring de crédit en Afrique subsaharienne — problématique des clients sans historique bancaire, les thin-files — et la problématique d'IT Nearshore qui nécessite un système opérationnel, explicable et conforme.

Les chapitres 2 et 3 seront alignés sur les décisions techniques documentées ici — chaque choix algorithmique sera justifié dans le mémoire avec les mêmes arguments expérimentaux."

---

## SLIDE 18 — Synthèse Révisée

"Je vais conclure avec la synthèse des quatre décisions — dont Q1 qui a évolué.

**Q2 — Sous-échantillonnage :** testé, éliminé. La perte de 183 631 observations réelles dégrade l'AUC et la généralisation. Décision maintenue.

**Q3 — SMOTE :** rejet architectural. Incompatible avec le pipeline WOE dans les deux configurations possibles. Argument réglementaire Bâle II complémentaire. Décision maintenue.

**Q4 — Motifs complexes :** LightGBM retenu après élimination de quatre candidats. Trois arguments architecturaux décisifs indépendants : GOSS, leaf-wise, benchmark Kaggle. Décision maintenue.

**Q1 — Autoencodeurs :** la première version de ce rapport concluait à l'élimination de l'AE pour distribution dégénérée. Cette conclusion était basée sur une erreur méthodologique — utilisation de la normalisation min-max sur la MSE brute. Après correction par la transformation log1p, l'AE est viable et produit un AUC de 0,5595 contre 0,5554 pour l'IF.

L'AE a été retenu comme modèle principal pour trois raisons spécifiques aux contraintes du projet :

Premièrement, le bottleneck 27 → 8 → 27 dimensions force l'AE à apprendre une représentation compressée de ce qu'est un profil normal. Un profil jamais vu ne peut pas traverser ce goulot sans erreur de reconstruction élevée. L'IF, lui, fait des coupes aléatoires et peut 'rater' une anomalie si elle tombe dans une région bien partitionnée par hasard.

Deuxièmement, en perspective d'extension du système à des millions d'observations — ce qui est la trajectoire naturelle d'IT Nearshore — l'AE accéléré GPU apprend des patterns de normalité plus fins. L'IF avec 200 arbres reste structurellement fixe au-delà d'un certain volume de données.

Troisièmement, la corrélation AE/LightGBM est de 0,0776 contre 0,1088 pour l'IF. Cette corrélation plus faible n'est pas un défaut — elle signifie que l'AE capte une dimension encore plus indépendante du score LightGBM, renforçant la complémentarité des trois mécanismes.

L'IF est conservé en fallback pour sa robustesse opérationnelle et son déterminisme total.

Chaque décision est justifiée par des résultats expérimentaux traçables et des arguments de conception défendables devant jury et auditeur bancaire.

Je suis disponible pour toute question."

---

*Fin du discours — Singhe Penka Hendrix Donavan — 21P050 — ENSPY GI2026*
