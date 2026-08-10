# HANDOVER DE FIN DE SESSION — CREDIX (fin Phase 1, entrée Phase 2)
## Point de reprise pour l'assistant principal (chat)

> **Auteur.** Singhe Penka Hendrix Donavan — 21P050 — GI2026 — ENSPY / IT Nearshore.
> **Projet.** CREDIX — scoring de crédit, 2 flux, Home Credit (proxy). Soutenance : début sept. 2026.
> **Notebook.** `credix-v3-quantification-2026-07.ipynb` (Kaggle).
> **Session couverte.** « Phase 1 » (30/07/2026) : Phases 1.1 et 1.2 réalisées et validées.

---

## 1. Objectif du travail (inchangé)

Démontrer que **chaque bloc du pipeline sert un objectif précis** d'un scoring régulé, même s'il fait
baisser une métrique globale. Échelle de preuve à 3 niveaux (I démontré / II littérature / III
hypothèse assumée). On code d'abord, on valide les chiffres ENSEMBLE, on rédige après. Jamais de
chiffre inventé.

---

## 2. Ce qui a été fait CETTE session (Phase 1 — CLOSE)

### Phase 1.1 — ρc par tranche (cellule 12.1) ✅
- Preuve que ρc (indice de couverture d'information) mesure la fiabilité du score.
- Seuils opérationnels (<0,25 / 0,25-0,40 / ≥0,40) **vides sur le proxy** (ρc min test = 0,3918) →
  bascule automatique en **terciles** (documentée).
- Résultat test : **AUC monotone croissante** 0,7322 / 0,7530 / 0,7650 (T1→T3) = preuve centrale.
  Brier cohérent (0,0869/0,0863/0,0759). ECE non monotone (documenté comme limite, bruit des petits
  paquets). Réserve proxy : gradient réel mais modeste (pas de vrai thin-file).
- Consigné : `RAPPORT_RESULTATS §8`. Figure `fig12_1_rho_tranches.png`.

### Phase 1.2 — Flux B intégré (cellule 12.2) ✅
- **Recentrage acté :** la partie « défaut ACCORDÉ+anomalie vs sain » ÉCARTÉE (anomalie ≠ défaut,
  hors-sujet par construction ; valeur du Flux B déjà prouvée par injection §5). Seul conservé = test
  du **biais dossier-incomplet**.
- Seuils AE **chargés** depuis `ae_metadata.json` (P95=0,1775 / P99=0,2451), non supervisés, NON
  recalculés. (⚠ correction importante de l'auteur : calibrer le seuil sur « les bons payeurs » =
  non-défauts aurait fait entrer TARGET dans un flux non supervisé — faute évitée.)
- 1re fois que le Flux B passe sur le test. Signalement : 5,82 % (P95) / 1,18 % (P99).
- Résultat par tercile ρc : P95 → T1 4,07 / T2 4,18 / T3 **9,22 %** ; P99 → 0,78 / 1,03 / 1,73 %.
  **Inverse de l'inquiétude** : les dossiers COMPLETS sont le plus signalés, pas les incomplets.
- **Lecture critique (PAS une victoire) :** effet du remplacement des NaN par la médiane → dossier
  incomplet « maquillé » en profil moyen → peu signalé → **ANGLE MORT** du Flux B sur les incomplets.
  Justifie a posteriori le garde-fou **ρc < 0,25** et invite à vérifier ce seuil. Réserve proxy.
- Consigné : `RAPPORT_RESULTATS §9`, `RAPPORT_DECISIONS §7-quinquies`. Figure `fig12_2_fluxb_integre.png`.

---

## 3. Décision structurante prise en fin de session

**Ablation V0→V6 (ancienne Phase 2) : ABANDONNÉE.** Redondante (WOE, scale_pos_weight, isotonic déjà
prouvés) ; modularisation complète trop coûteuse pour une valeur seulement pédagogique.

**Nouvelle Phase 2 = la PLACE des filtres univarié & multivarié.** Objet : démontrer que l'étage
univarié (IV → parcimonie/auditabilité) et l'étage multivarié (NAP → stabilité/anti-redondance) ont
chacun un rôle distinct et robuste au choix de l'outil. Méthode = Option 1 (comparaison légère :
quelles variables sélectionnées + AUC). Consigné : `RAPPORT_DECISIONS §7-sexies`, `TODO Phase 2`.

**Cette Phase 2 est DÉLÉGUÉE à Claude Code** (VS Code) pour préparer les cellules 12.3+. Deux
documents produits pour lui : `HANDOVER_CLAUDE_CODE_PHASE2.md` + `PROMPT_CLAUDE_CODE_PHASE2.md`.

---

## 4. Circuit de travail pour la Phase 2 (important)

1. L'auteur donne à **Claude Code** les 2 docs dédiés + le notebook → Claude Code écrit les cellules
   12.3+ (testées en local), sans exécuter.
2. L'auteur renvoie à l'**assistant principal (chat)** le notebook produit par Claude Code.
3. L'assistant principal **vérifie** le code (cohérence, anti-fuite, respect des règles) et dit si
   c'est bon à lancer.
4. L'auteur lance sur **Kaggle**, règle les « actifs » si besoin, renvoie les **sorties**.
5. L'assistant principal **valide les chiffres avec l'auteur**, PUIS consigne dans les rapports.

---

## 5. État des rapports (tous à jour au 30/07)

- `RAPPORT_DECISIONS_METHODOLOGIQUES_CREDIX.md` : §7-ter (fallback terciles), §7-quater + §7-quinquies
  (Flux B, angle mort), §7-sexies (place des filtres).
- `RAPPORT_RESULTATS_CONCLUSIONS_CREDIX.md` : §8 (ρc par tranche), §9 (Flux B intégré).
- `TODO_QUANTIFICATION_PIPELINE_CREDIX.md` : Phase 1 cochée ; Phase 2 (ablation) abandonnée ; nouvelle
  Phase 2 (filtres) détaillée.
- `ETAT_MEMOIRE_CLAUDE_CREDIX.md` : note 12 complétée (Phase 1 close + recadrage Phase 2).

---

## 6. Prochain pas (à la réouverture)

Attendre que l'auteur revienne avec le **notebook préparé par Claude Code** (cellules 12.3+).
Le vérifier avant lancement Kaggle. Ne rien consigner tant que les chiffres réels ne sont pas
validés ensemble.

## 7. Où ça entre dans le mémoire
- **Chapitre 2 (Conception)** : le *pourquoi* de chaque bloc (objectifs, Cas A).
- **Chapitre 3 (Résultats)** : les *chiffres* (Phases 0-2), ablation organisée par objectif.
- Le mémoire `MEMOIRE_SINGHE_PENKA_GI26.pdf` est à REFAIRE — ne pas s'en servir comme source.
