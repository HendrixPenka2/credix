# PROMPT CLAUDE CODE — CREDIX Phase 2 : la PLACE des filtres
## À coller dans Claude Code (VS Code). Spécifications exactes des cellules à écrire.

Salut Claude Code. Tu travailles sur mon mémoire CREDIX (scoring de crédit). Le notebook
`credix-v3-quantification-2026-07.ipynb` est dans le workspace. **Lis d'abord EN ENTIER le fichier
`HANDOVER_CLAUDE_CODE_PHASE2.md`** (contexte, règles absolues, variables disponibles) avant de coder.

Ta mission : écrire les cellules de la **Section 12.3+** qui démontrent la PLACE et l'OBJECTIF des
deux étages de filtrage (univarié & multivarié) du pipeline. **Ce n'est pas un concours d'outils**,
c'est une démonstration que chaque étage a un rôle structurel robuste au choix de l'outil.

---

## RÈGLES (rappel condensé — le détail est dans le HANDOVER)

- **On étend, on ne supprime pas.** Nouvelles cellules en Section 12.3+ UNIQUEMENT. Ne touche jamais
  aux Sections 0→11 ni aux cellules 12.0a/12.0b/12.1/12.2.
- **Tu n'exécutes pas le notebook.** Tu testes ta logique en local sur données factices, puis tu
  livres le code prêt à coller.
- Repérage par en-tête. Graine 42. Anti-fuite : tout ce qui s'apprend s'apprend sur le TRAIN.
- Option 1 (comparaison légère) : quelles variables sélectionnées + AUC test. PAS de re-réglage
  d'hyperparamètres par variante — réutilise `lgbm_final` ou un LightGBM aux MÊMES hyperparamètres.

---

## CE QUE TU DOIS PRODUIRE — 4 cellules

### CELLULE 1 — en-tête `# SECTION 12.3 — RÔLE DU FILTRE UNIVARIÉ : IV vs MUTUAL INFORMATION`

**Objectif démontré :** la place de l'étage univarié est robuste — si un autre filtre univarié
(Mutual Information) sélectionne à peu près les mêmes variables que l'IV, alors l'étage univarié
n'est pas un caprice de l'IV : n'importe quel filtre univarié raisonnable jouerait ce rôle de
parcimonie/auditabilité.

**Ce que la cellule fait :**
1. Rechargements avec garde (`if 'X' not in dir()`) : `X_train` (features engineered brutes),
   `y_train`, `features_iv` (ou reconstruire depuis `iv_scores_final.csv` : les `decision=='retained'`),
   `iv_scores_final.csv` (pour les IV). Charger aussi `X_test_nap`, `y_test`, `lgbm_final` pour l'AUC.
2. **Sélection univariée par Mutual Information** sur le TRAIN :
   - `from sklearn.feature_selection import mutual_info_classif`.
   - Les colonnes candidates = les mêmes que celles soumises à l'IV en Section 4 (toutes les
     features engineered avant filtre). Les NaN doivent être traités de façon cohérente : MI
     n'accepte pas les NaN → imputer par la médiane du TRAIN **uniquement pour ce calcul de MI**
     (documenté comme choix technique local, sans impact sur le pipeline réel qui, lui, garde le bin
     Manquant du WOE). Encoder les catégorielles en codes entiers (`.astype('category').cat.codes`)
     pour permettre le calcul, en le documentant.
   - Calculer `mi = mutual_info_classif(X_imp, y_train, random_state=42)`.
   - Retenir par MI les variables selon un critère comparable à l'IV : soit un seuil, soit — plus
     robuste — le **même nombre de variables** que l'IV a retenu (top-k où k = len(features_iv)).
     Documente le critère choisi.
3. **Comparer les deux sélections :**
   - nb de variables retenues par IV vs par MI ;
   - taille de l'intersection (variables communes) et le **taux de recoupement** (|IV ∩ MI| / |IV ∪ MI|,
     indice de Jaccard) ;
   - lister les quelques variables où IV et MI divergent (dans l'un pas l'autre).
4. **AUC test de chaque sélection** (Option 1, léger) :
   - Pour l'IV : c'est déjà le pipeline existant → AUC test de référence = 0,7510 (rappelée, pas
     recalculée inutilement, mais tu peux la recalculer via `lgbm_final.predict_proba(X_test_nap)`).
   - Pour le MI : entraîner un LightGBM aux **mêmes hyperparamètres** que `lgbm_final` (récupère-les
     via `lgbm_final.get_params()`), sur les features sélectionnées par MI **passées par le même
     WOE+NAP** si possible ; si le ré-encodage WOE des features MI est trop lourd, documente une
     approximation raisonnable (ex. entraîner sur les features MI encodées simplement) ET signale
     que c'est une comparaison indicative, pas un pipeline complet. **Reporter le n et l'écart d'AUC.**
5. **Figure** `fig12_3_iv_vs_mi.png` : un diagramme montrant le recoupement (ex. barres nb variables
   IV / MI / communes) + un texte d'AUC comparées.
6. **Print de synthèse** : recoupement en %, écart d'AUC, et une phrase de lecture (« recoupement
   élevé + AUC comparables → l'étage univarié est robuste au choix de l'outil »). **Ne pas conclure
   à la place de l'auteur si les chiffres ne le permettent pas** — juste rapporter.

### CELLULE 2 — en-tête `# SECTION 12.4 — RÔLE DU FILTRE MULTIVARIÉ : NAP vs VIF`

**Objectif démontré :** la place de l'étage multivarié est robuste — NAP et une sélection par VIF
(deux approches multivariées) traitent la redondance de façon cohérente.

**Ce que la cellule fait :**
1. Rechargements avec garde : `X_train_nap` (les 27 features WOE finales), `features_nap`, `y_test`,
   `X_test_nap`, `lgbm_final`.
2. **Calcul du VIF** sur les 27 features NAP (espace WOE, sans NaN) :
   - Essayer `from statsmodels.stats.outliers_influence import variance_inflation_factor`.
   - Si statsmodels absent : calculer le VIF à la main — pour chaque feature j, régression OLS de j
     sur toutes les autres, `VIF_j = 1/(1-R²_j)`. Fournir cette version de secours.
   - Reporter le VIF de chaque feature, trié décroissant. Règle classique : VIF > 5 (ou 10) = forte
     colinéarité.
3. **Comparer :**
   - NAP a gardé 27/27 (rôle confirmatoire) → quelles variables une sélection VIF (seuil 5 puis 10)
     écarterait-elle ? Les lister.
   - Si VIF écarte des variables : entraîner un LightGBM (mêmes hyperparamètres) sur les features
     restantes après VIF, AUC test, comparer à 0,7510. **Reporter le n.**
   - Si VIF n'écarte rien (tous VIF bas) : c'est un résultat en soi = NAP et VIF sont d'accord, aucune
     redondance forte → cohérence des deux approches multivariées.
4. Mentionner en commentaire **TSFFS** (Munkhdalai et al. 2019 ; Hapfelmeier) comme alternative
   documentée de la même famille (sélection multivariée) — pas à coder, juste cité.
5. **Figure** `fig12_4_nap_vs_vif.png` : barres des VIF par feature + ligne seuil 5/10.
6. **Print de synthèse** : cohérence NAP/VIF, effet éventuel sur l'AUC, phrase de lecture.

### CELLULE 3 — en-tête `# SECTION 12.5 — COMPLÉMENTARITÉ UNIVARIÉ × MULTIVARIÉ`

**Objectif démontré :** les deux étages ne font PAS double emploi — l'univarié coupe le bruit évident
(variables sans signal seul), le multivarié coupe la redondance cachée (variables corrélées entre
elles). Ce ne sont pas les mêmes variables visées.

**Ce que la cellule fait :**
1. Rappeler (depuis les cellules 12.3/12.4, ou recharger) : les variables coupées par l'étage
   univarié (celles rejetées par l'IV en Section 4, `decision=='rejected'` dans `iv_scores_final.csv`)
   vs les variables que l'étage multivarié viserait (fort VIF / redondantes de la cellule 12.4).
2. Montrer que ces deux ensembles sont **différents** : une variable rejetée par l'IV (pas de signal
   seul) n'est pas la même chose qu'une variable à fort VIF (signal seul mais redondant). Idéalement
   un petit tableau ou un diagramme illustrant les deux zones.
3. **Print de synthèse** : « l'univarié et le multivarié ne coupent pas les mêmes variables → chacun
   sert un objectif distinct (parcimonie vs anti-redondance) → les deux étages ont une place propre ».
4. Figure optionnelle `fig12_5_complementarite.png` (schéma simple des deux zones).

### CELLULE 4 (BONUS, seulement si tout le reste est propre) — en-tête `# SECTION 12.6 — BINNING OPTIMAL vs QUANTILES (WOE)`

**Objectif :** tester le *choix du découpage* du WOE (pas le WOE lui-même, déjà prouvé). Comparer le
binning optimal (OptimalBinning, actuel) à un binning par quantiles sur quelques variables, en termes
d'AUC et de lisibilité (nb de bins, monotonie). Léger, indicatif. Soupape : si ça alourdit, mettre en
perspective et ne pas coder.

---

## TESTS EN LOCAL (obligatoire avant livraison)

Écris un script `test_phase2_local.py` séparé (hors notebook) qui :
- fabrique des `X_train`, `y_train`, `X_test`, features factices (avec NaN, catégorielles, colonnes
  corrélées volontairement pour tester le VIF, colonnes bruit pour tester l'univarié) ;
- fait tourner la logique de chaque cellule (MI, VIF, recoupements, entraînement LightGBM léger) ;
- vérifie qu'il n'y a **aucune erreur** (dimensions, NaN, types), que les recoupements sont bien
  calculés, que le VIF se calcule (avec et sans statsmodels).
Montre la sortie de ce test dans ta réponse. Ne l'inclus pas dans le notebook.

---

## LIVRABLE FINAL DE TA PART

1. Les 3 (ou 4) cellules prêtes à coller, chacune avec son en-tête, du code commenté simplement
   (l'auteur déteste le jargon non expliqué — chaque terme technique expliqué à sa 1re apparition).
2. La sortie de ton test local (preuve que ça tourne).
3. Un récap : ordre d'exécution des cellules, ce que l'auteur doit lancer, quelles sorties/figures il
   doit renvoyer à l'assistant principal (chat) pour validation.

**Important :** ne consigne rien comme « validé », ne remplis aucun rapport. L'auteur exécute sur
Kaggle, renvoie les sorties à l'assistant principal (chat), et c'est LÀ qu'on validera et consignera
ensemble. Ton job s'arrête au code testé + prêt.
