# TODO — Quantification du pipeline CREDIX
## Feuille de route cochable : prouver/quantifier que chaque bloc sert un objectif

> **Auteur.** Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY / IT Nearshore.
> **Soutenance :** début septembre 2026.
> **Environnement :** Kaggle — on travaille sur une **duplication** du notebook `notebook-v2-random-search`.
> **Objet.** Ce n'est PAS choisir les blocs a posteriori. Le pipeline est un design principiel
> (littérature + objectifs métier) ; cette TODO **confirme/quantifie** ce que chaque bloc coûte et
> rapporte sur nos données, et — pour les points où plusieurs options étaient également défendables —
> montre que le choix tient sur ses mérites.
>
> **Documents de fond associés :** `RAPPORT_DECISIONS_METHODOLOGIQUES_CREDIX.md` (le pourquoi + refs) ;
> `RAPPORT_RESULTATS_CONCLUSIONS_CREDIX.md` (les chiffres) ; `methodologie_complete_v4.md` (référence,
> complétée en Phase 5).

---

## Rappel du cadre (voir RAPPORT_DECISIONS pour le détail)

- **7 objectifs d'un scoring régulé :** discrimination · calibration · explicabilité/conformité
  (RGPD/Bâle II) · stabilité · gestion asymétrique du risque (Recall) · gouvernance de la décision (ρc)
  · protection anti-fraude/atypiques (Flux B).
- **Échelle de preuve :** Niveau I (démontré empiriquement) · Niveau II (littérature/domaine, on cite)
  · Niveau III (hypothèse de travail assumée).
- **Cas A** = choix motivé par la littérature/objectif → la TODO **confirme**.
  **Cas B** = plusieurs options défendables → un test a **tranché**.
- **Verbe imposé :** *confirmer/quantifier* pour Cas A ; *trancher/démontrer* pour Cas B. Jamais
  « on a gardé le moins bon » pour le modèle.

## Règle notebook (IMPORTANT)

> **On étend, on ne supprime pas.** Les Sections 0→11 existantes sont validées : **on n'y touche pas**.
> Toutes les nouvelles cellules s'**ajoutent** dans une nouvelle **Section 12 — Quantification /
> ablation** (après la Section 11). Le seul nettoyage légitime (retrait des `print [DIAG]`) se fait à la
> toute fin, pour la soutenance — pas maintenant.

## Gabarit de chaque tâche

`Objectif · Cellule/section · Ce qu'on code · Résultat attendu · Critère de validation · Statut de preuve · Temps`

---

## PHASE 0 — Vérifier & réconcilier (≈ ½ jour)

- [x] **0.1 — Confirmer les métriques de référence** ✅ **VALIDÉ (run CREDIX_v3)**
  - *Objectif :* s'assurer que la duplication reproduit les chiffres du rapport avant d'ajouter quoi que ce soit.
  - *Résultat v3 (test) :* AUC **0,7510** / Gini **0,5020** / KS **0,3732** / Recall **0,7185** / F1 **0,2992**.
    Val : AUC 0,7578. Tous écarts < 0,002 vs réf. antérieure, signes opposés → **bruit de version Kaggle**, pas de dégradation.
  - *Décision :* le run v3 devient la **référence canonique**. Les chiffres antérieurs (0,7513…) ne sont plus cités (image Kaggle disparue, non reproductible).
  - *Action de fond actée :* figer les versions (protobuf+lightgbm+scikit-learn) en Section 0 au nettoyage final.
  - *Consigné :* `RAPPORT_RESULTATS §1`. *Statut :* VÉRIFIÉ.

- [x] **0.2 — Réconcilier le Jeu 2** ✅ **TRANCHÉ (run CREDIX_v3)**
  - *Objectif :* figer LE jeu de chiffres officiel des seuils.
  - *Cellule :* `# BK.1 — ÉTAPE C-bis : COMPARATIF DE JEUX DE SEUILS` (repérage par en-tête).
  - *Tranché :* référence canonique v3 = **ACCORDÉ 67,3 % / REVUE 28,6 % / REFUSÉ 4,0 % ; déf.ACC 5,1 %** (test).
    Ni 63,8/32,1/4,1 ni 65,9/31,1/3,0 (images antérieures, non reproductibles) ne sont retenus.
  - *Point méthodo :* décision sensible à l'environnement (seuil sur zone dense de PD) alors que le classement est robuste ; défaut sur ACCORDÉS stable (5,1 %) → qualité de risque inchangée.
  - *Consigné :* `RAPPORT_RESULTATS §3` (table 5 jeux + encadré RÉCONCILIÉ). Reste à corriger la ligne de `METHODO_BK1.md` et le `[À VÉRIFIER]` de `methodologie_v4` (au nettoyage final). *Statut :* TRANCHÉ.

---

## PHASE 1 — Les 2 preuves manquantes (≈ 1–1,5 j) — cœur de la thèse

- [x] **1.1 — ρc par tranche (preuve de la gouvernance)** — ✅ **VALIDÉ (run v3, test, 30/07)**
  - *Résultat (terciles, seuils officiels vides : n(<0,25)=0, n(0,25-0,40)=1 ; ρc min=0,3918) :*
    AUC T1/T2/T3 = **0,7322 / 0,7530 / 0,7650** (monotone croissante ✅) ; Brier 0,0869/0,0863/0,0759
    (cohérent) ; ECE 0,0086/0,0117/0,0078 (non monotone — documenté comme limite).
  - *Verdict :* preuve portée par AUC (monotone, nette) + Brier (cohérent) ; ECE nuancé. Gradient réel
    mais modeste (proxy trop fully-banked). *Consigné :* `RAPPORT_RESULTATS §8`. *Statut :* VALIDÉ.
  - *Figure :* `fig12_1_rho_tranches.png`. Réfs : Chow (1970), El-Yaniv & Wiener (2010) `[À VÉRIFIER]`.

- [x] **1.2 — Flux B intégré sur test** — ✅ **VALIDÉ (run v3, test, 30/07)**
  - *Recentrage acté :* la partie « défaut ACCORDÉ+anomalie vs sain » est **écartée** (anomalie ≠
    défaut → hors-sujet par construction ; valeur du Flux B déjà prouvée par injection §5). Seul le
    test du **biais dossier-incomplet** est conservé.
  - *Résultat (signalement anomalie par tercile ρc, zone ρc≥0,25) :* P95 → T1 4,07 % / T2 4,18 % /
    T3 **9,22 %** ; P99 → 0,78 / 1,03 / **1,73 %**. Signalement test global : 5,82 % (P95), 1,18 % (P99).
  - *Verdict :* inquiétude levée (incomplets PAS sur-signalés), MAIS lu comme **angle mort** (effet
    médiane maquille les incomplets → Flux B aveugle sur eux) → justifie le garde-fou ρc<0,25, pas une
    victoire. Réserve proxy (ρc min 0,39). *Consigné :* `RAPPORT_RESULTATS §9`, `RAPPORT_DECISIONS
    §7-quinquies`. *Figure :* `fig12_2_fluxb_integre.png`. *Statut :* VALIDÉ.
  - *Note code (nettoyage final) :* le verdict auto « pas de biais » ne testait qu'un sens (T1>T3) ; à
    corriger pour détecter les écarts dans les deux sens.

---

## PHASE 2 — Ablation V0→V6 — ⚠️ ABANDONNÉE (décision 30/07)

- [~] **ABANDON de l'ablation V0→V6 complète.** *Raison :* 3 des 5 blocs visés (WOE, scale_pos_weight,
  isotonic) sont **déjà démontrés** (Tâche 6 + BK.1) ; les ré-ablater serait redondant. La grosse
  modularisation (rendre tout le pipeline configurable en 7 versions + cache) coûte 2-4 j pour un
  résultat surtout pédagogique, sans preuve nouvelle. **Rapport coût/bénéfice défavorable.** On saute
  cette phase et on passe aux vraies preuves manquantes = la PLACE des filtres (nouvelle Phase 2 ci-dessous).

---

## PHASE 2 (ex-3) — La PLACE des filtres univarié & multivarié — cœur restant (délégué à Claude Code)

> **Recadrage clé (30/07).** L'objet n'est PAS un concours d'outils (« IV bat-il MI ? »). L'objet est
> de démontrer que **la fonction filtre-univarié** et **la fonction filtre-multivarié** ont chacune
> une **place et un objectif distincts** dans le pipeline, et que ce rôle est **robuste au choix de
> l'outil précis**. Fil directeur « chaque bloc sert un objectif ».
>
> **Les deux objectifs (thèse à démontrer) :**
> - **Filtre univarié (IV)** → objectif PARCIMONIE / AUDITABILITÉ : élimine tôt le bruit évident
>   (variables sans signal seul), pré-filtre rapide et lisible. Ne voit pas les relations entre
>   variables (pas son rôle).
> - **Filtre multivarié (NAP)** → objectif STABILITÉ / ANTI-REDONDANCE : traque la redondance qu'un
>   critère univarié ne peut pas voir (2 variables à bon IV peuvent dire la même chose). Complémentaire,
>   pas concurrent.
>
> **Méthode : OPTION 1 (comparaison légère).** Pour chaque test : quelles variables chaque filtre
> sélectionne (combien, recoupement) + AUC test du modèle final. PAS de re-réglage complet des
> hyperparamètres par variante (Cas B léger, défendable). **Petite** modularisation : brancher UNE
> alternative à UN endroit précis, tout le reste du pipeline intact. Nouvelles cellules Section 12.3+.

- [ ] **2.1 — Rôle du filtre UNIVARIÉ : IV vs Mutual Information**
  - *Question :* la place de l'étape univariée est-elle robuste au choix d'outil ? (IV et MI
    sélectionnent-ils ~les mêmes variables → rôle structurel, pas caprice de l'IV.)
  - *Code :* sélection univariée par MI (`mutual_info_classif` sur train, mêmes NaN traités pareil) ;
    comparer nb variables retenues, recoupement IV∩MI, AUC test du modèle sur chaque sélection.
  - *Attendu :* fort recoupement + AUC comparables → fonction univariée robuste. Réf. Siddiqi (2006).

- [ ] **2.2 — Rôle du filtre MULTIVARIÉ : NAP vs sélection par VIF**
  - *Question :* la place de l'étape multivariée est-elle robuste ? (NAP et VIF, deux approches
    multivariées, cohérentes sur la redondance ?)
  - *Code :* VIF des features ; quelles variables une sélection VIF écarterait vs NAP (qui a gardé
    27/27) ; AUC test si sélection VIF. Mentionner **TSFFS** (Munkhdalai 2019/Hapfelmeier) comme
    alternative documentée.

- [ ] **2.3 — Complémentarité univarié × multivarié (le liant)**
  - *Question :* les deux étapes font-elles double emploi ?
  - *Code :* montrer que l'univarié coupe le bruit évident et le multivarié la redondance cachée — pas
    les mêmes variables visées. *Attendu :* rôles distincts → thèse « deux places, deux objectifs ».

- [ ] **2.4 (bonus) — Binning optimal vs quantiles** (dans le WOE) — AUC + interprétabilité.
  - *Note :* le WOE lui-même n'est PAS ré-ablaté (déjà prouvé) ; on teste seulement le *choix du
    découpage*. **PAS** de WOE vs One-Hot (tranché Siddiqi 2006). **Soupape :** reportable en perspective.

---

## PHASE 4 — (Perspective, hors périmètre immédiat)

- [ ] German Credit — V0 vs V6 pour la portabilité. À faire seulement si le calendrier le permet ; sinon → section « Perspectives » du mémoire.

---

## PHASE 5 — CRITIQUE : compléter `methodologie_complete_v4.md` (fin de parcours)

- [ ] Injecter tous les **chiffres validés** (Phases 0-3) dans la v4 + les 2 rapports au fil de l'eau.
- [ ] Inscrire les **références exactes + où/comment trouvées** : Siddiqi (2006, seuil IV 0,02) · Munkhdalai et al. (2019, `sustainability1100699.pdf`) & Hapfelmeier (source NAP) + TSFFS comme alternative · Elkan (2001, seuil coût) · Brier (1950) · Guo et al. (2017, ECE) · Chow (1970) & El-Yaniv & Wiener (2010, classification sélective) `[À VÉRIFIER]` · Zadrozny & Elkan (2002, isotonic) · Ke et al. (2017, LightGBM) · Bergstra & Bengio (2012, random search).
- [ ] Lever tous les `[À VÉRIFIER NOTEBOOK]` de la v4.
- [ ] Distinguer, pour chaque bloc, **Cas A** (confirmation) vs **Cas B** (tranché) dans la formulation.
- [ ] Synchroniser `ETAT_MEMOIRE_CLAUDE_CREDIX.md` (miroir mémoire).

---

## Ordre d'exécution validé : 0 → 1 → 2 → 3 → (4 perspective) → 5

## Où ça entre dans le mémoire
- **Chapitre 2 (Conception)** : le *pourquoi conceptuel* de chaque bloc (Cas A / littérature).
- **Chapitre 3 (Résultats)** : les *chiffres* produits par cette TODO (Phases 0-3) + l'étude d'ablation organisée **par objectif**.

*Rien n'est exécuté sans GO explicite à chaque étape. On avance par bouts validables, repérés par en-tête visible.*
