# CORRECTIONS À INTÉGRER DANS LE MÉMOIRE
# Singhe Penka Hendrix Donavan — 21P050 — GI2026
# Identifiées en Sessions 4 et 5
# Format : Point → Chapitre → Ce qu'il faut écrire

================================================================
## CHAPITRE 2 — Analyse et Conception
================================================================

### [A2] Justification du seuil ρc = 0.40 pour la bannière documentaire

Section cible : 2.3.6 (Indice de couverture ρc)

Texte à ajouter après la définition de ρc :

"Le seuil ρc = 0.40 a été retenu comme déclencheur de la recommandation
documentaire sur la base du raisonnement suivant : les 13 features historiques
(catégorie C) représentent en moyenne 61% de l'IV total des 27 variables NAP.
Un dossier avec ρc < 0.40 signifie donc que moins de 40% du pouvoir prédictif
théorique est disponible, rendant la décision automatique statistiquement peu
fiable. Le seuil ρc = 0.25 correspond au cas limite où même les features
déclaratives majoritaires (catégorie B) sont insuffisantes — le profil est dit
thin-file critique."

---

### [B4] Formule PDO avec vérification numérique

Section cible : 2.3.5 (Calibration du score PDO)

Ajouter la vérification numérique après la formule :

"L'ancrage est vérifiable numériquement : pour PD = 5%,
Sc = 515.06 − 28.85 × ln(0.05/0.95) = 515.06 − 28.85 × (−2.944) ≈ 600.
Le paramètre PDO = 20 signifie qu'un doublement des cotes de défaut entraîne
une diminution de 20 points dans l'échelle de score."

---

### [Règle décision thin-file] Justification de la règle REFUSE pour dossier vide

Section cible : 2.3.5 (Règle de décision)

Ajouter après la description des zones de décision :

"Une règle complémentaire s'applique aux dossiers thin-file (ρc < 0.25) :
si le score automatique est inférieur au seuil de refus, la décision est
REFUSÉ directement, sans passage en revue manuelle. Cette règle évite
de soumettre au superviseur des dossiers où le profil est à la fois incomplet
et manifestement risqué. En revanche, si le score est dans la zone intermédiaire
malgré un dossier insuffisant, la revue manuelle est maintenue pour permettre
à l'agent de demander les documents manquants."

================================================================
## CHAPITRE 3 — Implémentation et Résultats
================================================================

### [B2] Tableau comparatif des modèles — obligatoire

Section cible : 3.x (Comparaison des modèles)

À VÉRIFIER : ce tableau doit exister dans le Chapitre 3.
Il doit contenir au minimum :
  - Régression logistique / Random Forest / XGBoost / LightGBM
  - Colonnes : AUC / Gini / KS / Recall / F1
  - Source : rapport_pipeline_scoring.pdf (métriques réelles)

Si absent → PRIORITÉ HAUTE à rédiger.

---

### [B3] Justification du Top 5 SHAP

Section cible : 3.x (Explicabilité)

Texte à ajouter :

"Le top 5 SHAP a été retenu comme niveau d'explication standard. Sur le jeu
de test Home Credit, les 5 variables les plus influentes couvrent en moyenne
plus de 85% de la magnitude totale des valeurs SHAP pour chaque décision,
constituant une couverture suffisante pour l'explication réglementaire sans
surcharger l'interface agent."

---

### [Bug WOE — contribution originale] Robustesse du pipeline

Section cible : 3.x (Implémentation du pipeline)

Note technique à mentionner :

"Lors des tests d'intégration, un bug de compatibilité entre la bibliothèque
optbinning et le format d'entrée de la fonction transform() a été identifié.
La correction consiste à passer les valeurs sous forme de tableau numpy
(np.array) plutôt que sous forme de DataFrame pandas, le résultat étant
ensuite extrait par indexation positionnelle [0] au lieu d'une indexation
par nom de colonne."

---

### [PSI null = normal] Monitoring — résultats en contexte de démo

Section cible : 3.x (Monitoring et dérive)

Texte à ajouter :

"Dans le cadre de la démonstration académique, l'indice PSI retourne une valeur
nulle (statut INSUFFISANT) en raison du faible volume de scorings disponibles
(N < 10). En production réelle, avec un flux mensuel de plusieurs centaines de
demandes, le PSI serait calculé en comparant la distribution des 30 premiers
jours post-déploiement à la distribution des 30 derniers jours."

---

### [Promote-model — limite] Stabilité des features lors d'une promotion

Section cible : 3.x (Gouvernance des modèles) ou Perspectives

Texte à ajouter :

"La procédure de promotion de modèle suppose une stabilité de l'espace de
features entre les versions successives. Autrement dit, tout nouveau modèle
promu en production doit utiliser les mêmes 27 variables NAP. Un changement
de l'espace de features constituerait une migration complète du système,
nécessitant la mise à jour de l'ETL, du schéma MongoDB et des artefacts
WOE, et ne peut être réalisée via la simple procédure de promotion."

================================================================
## SECTION LIMITATIONS ET PERSPECTIVES
================================================================

### [A4] Terminologie technique vs terminologie métier

Note de bas de page ou glossaire :

"Dans le code source, les décisions sont encodées sans accents ('ACCORDE',
'REFUSE', 'REVUE_MANUELLE') pour des raisons de compatibilité Python.
L'interface utilisateur et le rapport PDF affichent les formes accentuées
('ACCORDÉ', 'REFUSÉ', 'REVUE MANUELLE')."

---

### [B1] Variable CODE_GENDER — usage académique et contraintes réglementaires

Section cible : Limitations

Texte à ajouter :

"La variable CODE_GENDER_bin (genre du client, binaire) figure parmi les
27 variables retenues par la procédure NAP, car son Information Value
est statistiquement significatif sur le dataset proxy Home Credit. Dans
le cadre académique, son usage est justifié. En déploiement production
réel, cette variable devrait être évaluée au regard du cadre réglementaire
applicable (principes de non-discrimination OHADA, recommandations COBAC)
avant toute intégration au modèle. L'architecture du système permet ce retrait
sans modification du pipeline, par simple mise à jour du fichier nap_features.pkl."

================================================================
## ÉTAT DES CORRECTIONS
================================================================

Légende :
  [URGENT]   → doit être dans le mémoire V1
  [IMPORTANT] → doit être dans le mémoire V2
  [OPTIONNEL] → ajoute de la valeur mais pas bloquant

| Point | Chapitre | Statut |
|-------|----------|--------|
| A2 — Seuil ρc 0.40 justifié | Ch.2 §2.3.6 | URGENT |
| B2 — Tableau comparatif modèles | Ch.3 | URGENT |
| B4 — Formule PDO vérification | Ch.2 §2.3.5 | URGENT |
| Règle thin-file REFUSE | Ch.2 §2.3.5 | URGENT |
| B3 — Top 5 SHAP justifié | Ch.3 | IMPORTANT |
| PSI null normal | Ch.3 | IMPORTANT |
| Promote-model limite features | Ch.3/Perspectives | IMPORTANT |
| B1 — CODE_GENDER note | Limitations | IMPORTANT |
| Bug WOE corrigé | Ch.3 impl. | OPTIONNEL |
| A4 — Terminologie note | Glossaire | OPTIONNEL |

================================================================
# Produit en Session 5 — 05 juin 2026
================================================================
