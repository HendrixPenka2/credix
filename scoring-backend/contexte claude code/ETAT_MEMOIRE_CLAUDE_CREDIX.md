# État de la mémoire interne de Claude — projet CREDIX
## Miroir `.md` des notes que Claude conserve d'une session à l'autre

> **À quoi sert ce fichier.** Claude garde, entre les sessions, un petit espace de notes internes
> propre à ce projet. Ce n'est pas un fichier que tu peux ouvrir directement ; c'est pourquoi ce
> `.md` en est une **copie miroir**. Objectif : si la mémoire interne se remplit ou est réinitialisée,
> tout est aussi consigné ici et peut être rechargé dans le project knowledge.
>
> **Règle de synchronisation.** À chaque fois que Claude ajoute/modifie une note en mémoire, il met
> aussi ce fichier à jour. Ce fichier et la mémoire interne doivent rester identiques.
>
> **Dernière synchronisation :** session « Quantification » run CREDIX_v3 (11 notes).

---

## Les 11 notes actuellement en mémoire (verbatim)

1. Soutenance CREDIX reportée à début septembre 2026 (plus « avant mi-juillet »). Le « Rapport
   d'étude Flux A+B » (PDF préparé pour Pr Batchakui) est déjà rédigé sur les 2 flux ; document
   distinct du mémoire 3-chapitres mais qui alimente le Chapitre 3 (résultats) et la méthodologie.

2. CREDIX est structuré en 2 flux : Flux A (scoring supervisé : feature engineering → IV → WOE → NAP
   → LightGBM → SHAP + ρc → PDO) et Flux B (garde-fou de détection d'anomalie NON supervisée).
   Architecture de décision à 3 couches (Flux A ∥ Flux B → fusion), escalade CONSERVATIVE : le Flux B
   ne peut que durcir (ACCORDÉ→REVUE), jamais assouplir un REFUSÉ.

3. Flux B : Autoencodeur = détecteur PRINCIPAL, Isolation Forest = fallback, LOF ÉCARTÉ du déploiement
   (RGPD : transporte les données clients ; O(N_train)). Encodage HYBRIDE 61 dims (20 num + 18 One-Hot
   + 22 One-Hot+Unknown + 1 Frequency ORGANIZATION_TYPE), + IF-Frequency 27 dims en contrôle a
   fortiori. Désactivé si ρc<0.25. Décision AE prise par injection d'anomalies synthétiques (familles
   permutation/extrêmes/mixte × intensités 2/5/9 ; AE 8/9 victoires strictes). Seuil P95 vs P99 NON
   tranché (dépend PDO recalibré + capacité de revue).

4. CORRECTION choix modèle (BK.2) : LightGBM et XGBoost sont INDISTINGUABLES sur le proxy Home Credit
   (tous écarts <0.002, non significatifs ; XGBoost marginalement devant sur 5/7 métriques : AUC
   0.7585 vs 0.7575). L'ancien argument « LightGBM gagne le Recall 0.726 vs 0.438 » est REJETÉ comme
   faux/fragile. GOSS testé explicitement → aucun gain, Recall recule → NON activé. LightGBM retenu
   sur : propriétés structurelles (GOSS/EFB/leaf-wise/catégorielles natives — avantages à l'échelle,
   décrits comme propriétés pas comme gains), continuité du pipeline, réévaluabilité. NE JAMAIS dire
   « on a gardé le moins bon » (formulation dangereuse en soutenance).

5. Recalibration PDO (BK.1) : recalibration ISOTONIQUE (B3) appliquée par-dessus le modèle qui GARDE
   scale_pos_weight (découple détection des défauts / correction de l'échelle). Diagnostic avant :
   proba moyenne 43.5% vs réel 9.4% (gonflée ×4.6), Brier 0.216, ECE 0.34. Après : Brier ~0.083, ECE
   <0.01, AUC préservée (transformation monotone). Les 4 méthodes (B1 sans-poids / B2 Platt / B3
   isotonic / SMOTE contre-ex.) calibrent à égalité ; B3 choisie sur généralisabilité (aucune forme a
   priori, réapprise sur tout dataset).

6. Seuils de décision recalés EN PD (Jeu 2, retenu parmi 5 jeux comparés) : ACCORDÉ si PD<10%, REFUSÉ
   si PD>30%, REVUE entre. Offset 515.06 / Factor 28.85 INCHANGÉS (type A, convention d'échelle).
   Équivalences PD↔score (v3) : PD 5%→600,02 (ancrage), PD 10%→578,5, PD 30%→539,5 ; les anciennes
   bandes brutes 600/500 sont superseded (repères visuels à réaligner sur 578,5/539,5 au nettoyage).
   RÉPARTITION CANONIQUE v3 (test) du Jeu 2 : ACCORDÉ 67,3% / REVUE 28,6% / REFUSÉ 4,0% ; défaut réel
   sur ACCORDÉS 5,1%. Les anciens 63,8/32,1/4,1 et 65,9/31,1/3,0 sont ABANDONNÉS (images Kaggle
   antérieures, non reproductibles). Le seuil est une HYPOTHÈSE DE TRAVAIL assumée (proxy). Méthode
   générale = Elkan (2001), T*=C_FP/(C_FP+C_FN) — NON appliquée car Home Credit ne fournit pas de coûts
   métier réels, et parce qu'elle exige des probas calibrées (fournies par B3).

7. Tâche 6 (AE comme réducteur de dimension pour Flux A) : testée et ÉCARTÉE. AUC-test : WOE-27 0.7513
   < AE-48 0.7099 < brut-528 0.7713 ; goulot latent 48 (archi 528→159→48→159→528). AE écarté pour 2
   motifs généralisables (perte de discrimination + explicabilité par variable détruite : vecteur
   latent anonyme). L'avantage brut>WOE (+0.02) est LOCAL à la richesse des tables Home Credit → posé
   en piste/perspective (dériver des features nommées passées par WOE+NAP), pas un verdict.
   scale_pos_weight ≈ 11.4 (pipeline WOE-27), 12.61 (Tâche 6 brut-528).

8. Métriques de référence CANONIQUES = run CREDIX_v3 (Phase 0.1, juillet 2026), WOE-27 (val / test) :
   AUC 0.7578/0.7510 ; Gini 0.5156/0.5020 ; KS 0.3810/0.3732 ; Recall 0.7277/0.7185 ; F1
   0.2851/0.2992. (Réf. antérieure test AUC 0.7513 etc. = image Kaggle disparue, écarts <0.002 de
   signes opposés = bruit de version, PLUS citée.) Cause dérive = image Kaggle mise à jour → LightGBM
   version différente → modèle légèrement différent. ACTION actée : figer versions (protobuf+lightgbm
   +scikit-learn) en Section 0 au nettoyage final. FRONTEND très avancé (corriger « pas
   commencé ») : Phases 1-4 finies (Fondations, Agent 2.x, Superviseur 3.x, Admin 4.x), Phase 5
   (librairie components/ui/ + retrofit admin) EN COURS, Phases 6 (polish UX) et 7 (nettoyage
   soutenance) restantes. Restes BACKEND : aligner isotonic B3 + décision-en-PD (Jeu 2) + Flux B 61
   dims (colonnes_ordonnees_61.json, 11 artefacts) + message du Cas 4 (ρc<0.25 + Score≥500) + retrait
   print [DIAG] + model_metrics.json à l'upload.

9. Cadre de démonstration du pipeline (acté) : (1) ÉCHELLE DE PREUVE à 3 niveaux — I démontré
   empiriquement (ablation/partition/injection), II ancré littérature+domaine (on cite, on ne re-run
   pas), III hypothèse de travail assumée (seuils 10/30 → Elkan). (2) HIÉRARCHIE des objectifs —
   contraintes dures (explicabilité par variable RGPD/Bâle II, calibration, traçabilité) > priorité
   métier (Recall>Precision) > arbitrages (AUC/parcimonie) > garde-fous (stabilité, ρc, Flux B). Règle
   : un bloc est retenu ssi (il fait progresser son objectif, mesuré) ET (son coût tombe sur une
   métrique ni dure ni prioritaire). ρc prouvé par PARTITION risque-couverture (Brier/ECE par tranche
   de ρc ; réfs Chow 1970, El-Yaniv & Wiener 2010 — à vérifier).

10. Deux nouveaux .md « au fil de l'eau » tenus à jour à chaque session (à ajouter au project
    knowledge) : RAPPORT_DECISIONS_METHODOLOGIQUES_CREDIX.md (le FOND : principe objectif-par-bloc,
    échelle de preuve 3 niveaux, hiérarchie des objectifs, matrice de démonstration par bloc, focus
    modèle/Elkan/ρc, références) et RAPPORT_RESULTATS_CONCLUSIONS_CREDIX.md (résultats validés
    consolidés + résultats à produire). methodologie_complete_v3.md (Session 3, 31 mai) est PÉRIMÉE
    (ignore tout le Flux A/B) → réécrite en v4. German Credit prévu comme 2e dataset (portabilité).
    Runs restant à faire (Niveau 1) : ρc par tranche, défaut « ACCORDÉ+anomalie » vs « ACCORDÉ sain »,
    ablation V0→V6, alternatives ciblées par bloc (IV vs MI, binning quantile, VIF).

11. SESSION « Quantification » (run CREDIX_v3, notebook dupliqué `CREDIX_v3_quantification_2026-07`).
    (a) AUDIT du notebook fait (`AUDIT_NOTEBOOK_CREDIX.md`) : Flux B SAIN (autoencoder.keras + encoder_hybrid.pkl
    + scaler_if.pkl + colonnes_ordonnees_61.json + seuils P95/P99 en log1p, cohérents ; ancien conflit
    min-max/log1p RÉSOLU). Flux A avait 2 TROUS backend : (i) calibration isotonique JAMAIS sauvegardée
    → lgbm_final.pkl renvoie PD gonflées ; (ii) seuils décision + offset/factor jamais dans un artefact.
    Bruit repéré (nettoyage FINAL, pas maintenant) : cellule « DIAGNOSTIC TEMPORAIRE » jetable à retirer ;
    diagramme dit `encoder_if.pkl` mais vrai fichier = `encoder_hybrid.pkl` ; texte Section 8 « LightGBM
    domine sur le Recall » FAUX (contredit BK.2) à corriger ; repères figures 600/500 → 578,5/539,5.
    (b) 2 cellules AJOUTÉES en Section 12.0 (« on étend, on ne modifie pas », après CELLULE 12 synthèse
    Section 11, avant l'export figures) : 12.0a sauve `isotonic_calibrator.pkl` (contrôle : 43,47%→9,28%,
    garde-fou AUC |Δ|=0,0005) ; 12.0b sauve `decision_config.json` (offset 515.06, factor 28.85, pd_accorde
    0.10, pd_refuse 0.30, équivalences score 578,5/539,5). Les 3 artefacts backend (lgbm_final.pkl +
    isotonic_calibrator.pkl + decision_config.json) viennent du MÊME run v3 → cohérents ; à régénérer
    ENSEMBLE si re-run. Chaîne backend Flux A : X→woe→nap→lgbm.predict_proba→iso.predict→PD→PDO→décision.
    (c) Erreur env. rencontrée : protobuf trop ancien pour TensorFlow (`runtime_version`), cause = image
    Kaggle + pip install Section 0 qui rétrograde protobuf ; correctif `pip install -U "protobuf>=4.26"`
    + Restart & clear cell outputs + reprise à CELLULE 2 (gardes de rechargement disque). (d) PHASE 0
    (0.1 + 0.2) VALIDÉE. PROCHAIN = Phase 1.1 (ρc par tranche sur test : X_test_iv, iv_dict, features_nap,
    iv_total_possible ; découpage <0.25/0.25-0.40/≥0.40 ; AUC+Brier+ECE+n par tranche ; attendu monotone).

12. SESSION « Phase 1 » (30 juillet 2026, suite de la session Quantification). GO donné pour Phase
    1.1 (ρc par tranche sur test, 46 128 clients). PROBLÈME DÉCOUVERT : ρc minimum observé (échantillon
    val, Section 10) = 0,4722 → les tranches officielles (<0,25 / 0,25-0,40) seraient VIDES sur ce
    proxy Home Credit (trop "fully-banked", pas assez de dossiers minces). DÉCISION ACTÉE (utilisateur
    d'accord) : fallback automatique en TERCILES si une tranche a <30 clients, mode de découpage affiché
    explicitement (jamais caché) — cf. RAPPORT_DECISIONS §7-ter. Code testé en local sur données
    factices : bug trouvé et corrigé (pd.qcut plantait sur les valeurs dupliquées à ρc=1,0 → corrigé en
    passant par le rang avant découpage en tiers). Calcul ρc vectorisé (formule : somme des IV des
    features NAP non-NaN dans X_test_iv, divisée par IV total possible) validé identique au calcul par
    boucle de la Section 10 (erreur <1e-6 sur 20 clients test).
    EXTENSION Phase 1.2 actée (utilisateur d'accord) : ajout d'un test pour vérifier que le Flux B (AE)
    ne confond pas "dossier incomplet" (ρc faible) et "client suspect" — risque soulevé par
    l'utilisateur. Le garde-fou ρc<0,25 (désactivation Flux B) couvre déjà le cas extrême ; reste à
    vérifier empiriquement la zone ρc∈[0,25 ; dossier complet[ où on SUPPOSE (non vérifié) que le
    remplacement des NaN par la médiane (dans scaler_if.pkl) protège contre ce biais. Test ajouté :
    comparer le taux de signalement anomalie (P95/P99) entre Groupe A (ρc bas) et Groupe B (ρc haut),
    dans la zone où le Flux B est actif — cf. RAPPORT_DECISIONS §7-quater. Si écart net → biais confirmé,
    à documenter + envisager de relever le seuil 0,25. Si comparable → mécanisme protège, chiffre à
    l'appui.
    Prochaine action immédiate : produire le code de la cellule Section 12.1 (ρc par tranche) pour que
    l'utilisateur l'exécute sur Kaggle.

    RÉSULTAT PHASE 1.1 — VALIDÉ (run v3, test, 30/07). Seuils officiels confirmés VIDES : n(<0,25)=0,
    n(0,25-0,40)=1 → bascule terciles (3×15 376). ρc test : min 0,3918 / moy 0,8891 / méd 0,922.
    AUC par tercile bas/moyen/haut = 0,7322 / 0,7530 / 0,7650 → MONOTONE CROISSANTE ✅ (preuve centrale
    de ρc : plus le dossier est complet, mieux le modèle discrimine ; écart T1→T3 = +0,033). Brier
    0,0869/0,0863/0,0759 (cohérent, gros gain sur T3). ECE 0,0086/0,0117/0,0078 (NON monotone — T2
    pire ; documenté comme limite = bruit statistique des petits paquets, amplitude minime). Verdict :
    preuve portée par AUC (net) + Brier (cohérent), ECE nuancé honnêtement. Réserve proxy : gradient
    réel mais modeste car pas de vrai thin-file (ρc min 0,39). Consigné RAPPORT_RESULTATS §8, figure
    fig12_1_rho_tranches.png. PROCHAIN = Phase 1.2 (défaut ACCORDÉ+anomalie vs sain + test biais AE
    dossier-incomplet).

    RÉSULTAT PHASE 1.2 — VALIDÉ (run v3, test, 30/07) → PHASE 1 CLOSE. RECENTRAGE acté (utilisateur) :
    partie « défaut ACCORDÉ+anomalie vs sain » ÉCARTÉE (anomalie ≠ défaut, hors-sujet ; valeur Flux B
    déjà prouvée par injection Section 11). Seul conservé = test biais dossier-incomplet. Seuils AE
    CHARGÉS depuis ae_metadata.json (P95=0,1775 / P99=0,2451, non supervisés, PAS recalculés — erreur
    initiale Claude « seuil sur bons payeurs=non-défauts » corrigée par utilisateur : aurait fait
    entrer TARGET dans flux non supervisé). 1re fois Flux B sur test (46 128). Signalement global :
    5,82 % P95 / 1,18 % P99. Biais par tercile ρc (zone ρc≥0,25) : P95 T1 4,07 / T2 4,18 / T3 9,22 % ;
    P99 0,78 / 1,03 / 1,73 %. RÉSULTAT INVERSE de l'inquiétude : les dossiers COMPLETS (T3) sont le plus
    signalés. LECTURE CRITIQUE (validée, PAS une victoire) : effet remplacement NaN par médiane →
    incomplet « maquillé » en profil moyen → reconstruit facilement → peu signalé → ANGLE MORT du
    Flux B sur les incomplets (fraude logée dans variables manquantes passerait sous radar). JUSTIFIE
    a posteriori le garde-fou ρc<0,25 + invite à vérifier ce seuil. Réserve proxy : ρc min 0,39 →
    angle mort raisonné pas mesuré. Consigné RAPPORT_RESULTATS §9, RAPPORT_DECISIONS §7-quinquies,
    figure fig12_2_fluxb_integre.png. Note nettoyage : verdict auto code testait 1 seul sens, corriger.
    PROCHAIN = PHASE 2 (ablation V0→V6 : modularisation flags + cache parquet, table métriques/version).

---

*Fin du miroir. Si Claude perd sa mémoire interne, recharger ces 12 notes dans le project knowledge
suffit à restaurer le contexte de travail.*
