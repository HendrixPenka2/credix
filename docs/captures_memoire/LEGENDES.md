# Légendes — captures section 3.6 (mémoire CREDIX)

Toutes les captures : 1440×900, deviceScaleFactor 2 (PNG 2880×1800 sauf mention),
thème clair, sans chrome de navigateur. Générées par `capture_agent.js`,
`capture_superviseur.js`, `capture_admin.js` (voir README.md du dossier).

---

## 3.6.1 — Espace AGENT

### fig3_6_01_a_fiche_client_vue_ensemble.png
**Page / rôle :** `/clients/HC-100001`, AGENT (Joseph Ateba) — fiche client "Hatem Ben Salem".
**Montre :** le profil, le dernier score (511, en revue), la couverture ρc (100 %) et les
facteurs SHAP principaux, réunis sur la vue d'ensemble d'un client à l'historique riche.

### fig3_6_01_b_score_etape2_formulaire.png
**Page / rôle :** `/score`, étape 2, AGENT — client nouvellement créé ("Solange Ekwalla",
dossier déclaratif sans historique bureau).
**Montre :** les 11 champs du formulaire de données de la demande, tous portant un libellé
en langue naturelle ("Annuité mensuelle (FCFA)", "Ancienneté à l'adresse actuelle (mois)"…).
Un client existant n'aurait affiché que 4 champs — le nombre de champs dépend du schéma
renvoyé par `GET /api/scoring/form-schema`, pas d'un formulaire codé en dur.

### fig3_6_02_resultat_evaluation_{brut,annote}.png
**Page / rôle :** `/score`, étape 3, AGENT — client HC-100141 ("Tagne Bernadette").
**Montre (fullPage, contenu dépasse un écran) :** la jauge de score PDO (620), la décision
(EN REVUE), l'anneau de couverture (79 %), le percentile, les 5 facteurs SHAP et le bloc
d'anomalie complet — score, détecteur (autoencodeur), percentile de référence et 3 facteurs
expliquant l'atypicité (montant d'acompte, retard de paiement, ratio de paiement).
Le score initial (620) aurait normalement conduit à un octroi ; c'est l'anomalie qui force la
revue manuelle ("if_escalade") — la chaîne probabilité → score → décision et les deux
mécanismes d'explication (SHAP signé vs erreur de reconstruction) coexistent sur un seul écran.
**Annotations :** ① jauge de score · ② décision · ③ anneau de couverture · ④ facteurs SHAP ·
⑤ bloc d'anomalie.

### fig3_6_03_a_couverture_bien_renseignee.png
**Page / rôle :** `/score`, étape 3 (bloc "Couverture de données" isolé), AGENT — HC-100001.
**Montre :** ρc = 100 %, aucune bannière de recommandation documentaire.

### fig3_6_03_b_couverture_sous_seuil_documents.png
**Page / rôle :** `/score`, étape 3 (bloc "Couverture de données" isolé), AGENT —
CLT-20260821-DD5B4094 ("Alain Mbarga").
**Montre :** ρc = 42 % (0,4163, sous le seuil de 0,42), bannière "Confiance limitée" avec la
liste des documents recommandés et le gain de ρc estimé pour chacun.
**Vérification demandée :** score = 571, décision = REVUE_MANUELLE (badge "EN REVUE"), flux de
contrôle actif — confirmés (voir rapport de fin de mission).

### fig3_6_03_c_simulation_comparaison.png
**Page / rôle :** `/simul`, étape 3 (Comparaison), AGENT — HC-100001.
**Montre :** thème orange du simulateur (bandeau "MODE SIMULATION", carte "SCÉNARIO SIMULÉ"
bordée orange, badge "SIMULÉ"), score réel (595, accordé) vs score simulé (600, accordé),
deltas chiffrés (Δ Score +5, Δ PD −0.9 pt) — visuellement impossible à confondre avec une
évaluation réelle.

### fig3_6_04_historique_rapport.png
**Page / rôle :** `/hist`, AGENT — HC-100001 (27 évaluations disponibles).
**Montre :** les courbes d'évolution du score et de la couverture, le tableau chronologique
avec sa ligne la plus récente dépliée (facteurs SHAP, bloc d'anomalie, bouton de
téléchargement PDF de cette évaluation précise).

---

## 3.6.2 — Espace SUPERVISEUR

### fig3_6_05_revue_dossier_{brut,annote}.png
**Page / rôle :** `/superviseur/revue`, SUPERVISEUR (Carine Ndongo) — dossier HC-100141
sélectionné (fullPage, contenu dépasse un écran).
**Montre :** la file d'attente (9 dossiers visibles, dont "Bernadette Tagne" portant le badge
"Interceptée"), les jauges score/couverture, l'analyse d'anomalie complète (revue forcée par
le détecteur malgré un score de 620 qui aurait normalement mené à un accord), le profil
emprunteur, les données figées de la demande, les 5 facteurs SHAP, et le formulaire de
décision avec bascule Accordé/Refusé et commentaire justificatif partiellement rempli
(157/500 caractères).
**Annotations :** ① file d'attente · ② données figées de la demande · ③ analyse d'anomalie ·
④ commentaire justificatif.

### fig3_6_06_derive_modele.png
**Page / rôle :** `/superviseur/modele/derive`, SUPERVISEUR.
**Montre :** la jauge segmentée PSI, les échantillons de référence (43, depuis le 05/08/2026)
et actuel (43, calculé le 29/08/2026), le bloc pédagogique d'aide à la lecture.
**Écart signalé :** l'aiguille est à 0.000 (zone stable), pas en zone "attention" comme
souhaité idéalement. Les fenêtres de référence et actuelle se recouvrent presque totalement
avec les données de démonstration disponibles ; fabriquer un écart aurait exigé de créer un
lot de fausses évaluations antidatées. Choix validé avec l'auteur : capturer l'état réel
plutôt que fabriquer une dérive artificielle.

---

## 3.6.3 — Espace ADMINISTRATEUR

### fig3_6_07_configuration_seuils_{brut,annote}.png
**Page / rôle :** `/admin/configuration`, ADMIN (Systeme Administrateur).
**Montre :** les seuils de décision PDO avec les 3 zones (refus/revue/accord), et — colonne de
droite — le rappel en lecture seule des seuils de couverture ρc **et** de la sensibilité de
détection Flux B (percentile P95).
**Modification de code signalée :** le champ "Sensibilité de détection (Flux B)" apparaissait
comme un formulaire éditable (menu déroulant + bouton Enregistrer) dans la colonne de gauche,
alors qu'il s'agit d'une valeur dérivée de la population d'apprentissage. Remplacé par une
carte en lecture seule ("NON MODIFIABLE"), au même emplacement et dans le même style que la
carte des seuils ρc. Voir le rapport de fin de mission pour le détail du changement.
**Annotations :** ① seuils PDO, modifiables · ② seuils dérivés des données, en lecture seule
(couvre les deux cartes "NON MODIFIABLE/NON MODIFIABLES").

### fig3_6_08_a_upload_modele_{brut,annote}.png
**Page / rôle :** `/admin/modeles`, modale "Importer un nouveau modèle", ADMIN.
**Montre :** les 14 artéfacts requis répartis en 4 groupes (Pipeline LightGBM, Calibration &
Décision, Prétraitement & Isolation Forest, Autoencodeur), avec nom de version et description
renseignés, et les compteurs "x/x" par groupe.
**Modification de code signalée :** l'upload échouait systématiquement (422, tous les champs
manquants) — l'instance axios partagée fixait un `Content-Type: application/json` par défaut,
ce qui empêchait axios de poser le bon en-tête multipart/boundary pour un `FormData`. Corrigé
en forçant la suppression de l'en-tête pour cet appel précis. Voir le rapport de fin de
mission.
**Annotations :** ① un des quatre groupes d'artefacts · ② compte de fichiers exigés pour ce
groupe.

### fig3_6_08_b_promotion_modele_{brut,annote}.png
**Page / rôle :** `/admin/modeles`, modale "Promouvoir en production", ADMIN.
**Montre :** comparaison production actuelle (CREDIX_v3_refonte_61dims_BK1) vs candidat
(CREDIX_v4_memoire_2026, la version importée en 08_a), avertissement "Action critique"
(immédiat et irréversible), case de confirmation **volontairement laissée décochée** — le
bouton "Confirmer la mise en production" apparaît donc désactivé.
**Important :** cette action n'a jamais été confirmée pendant la génération des captures —
la version importée contient des fichiers factices (placeholders) et sa mise en production
aurait cassé le pipeline de scoring réel. Elle reste en statut STAGING, jamais promue.
**Annotation :** ① case de confirmation obligatoire.

### fig3_6_09_journal_audit.png
**Page / rôle :** `/admin/audit`, ADMIN.
**Montre :** une ligne dépliée (évaluation HC-100141, agent Joseph Ateba) avec adresse IP
(172.25.0.1) et détail JSON (`{"decision": "REVUE_MANUELLE", "score": 571}`) complets et
lisibles, au-dessus d'un tableau de plusieurs dizaines d'actions variées (connexions,
évaluations, simulations, création de compte, création de client…), chaque ligne portant
auteur, rôle, action et horodatage.
**Modification de code signalée :** la colonne "Utilisateur" affichait l'UUID interne brut
(ex. `3b7fe3b6-7eb7-…`) au lieu d'un nom lisible ; le journal d'audit ne renvoyait pas non plus
l'adresse IP ni le détecteur/facteurs d'anomalie pour les revues superviseur. Trois correctifs
backend appliqués (résolution du nom d'utilisateur, IP réelle sur les évaluations, projection
des champs d'anomalie manquants) — détail dans le rapport de fin de mission.
**Écart signalé :** pour que l'IP et le JSON complets restent visibles dans la fenêtre 1440×900,
la page est légèrement défilée après dépliage ; la barre de filtres ("Filtrer par identifiant…",
"Toutes les actions") sort alors du cadre. À densité de ligne égale, filtres + 8 lignes + le
détail dépassent à eux seuls 900px de haut — montrer les trois éléments simultanément dans une
seule fenêtre n'était pas possible sans dérouler la page (une version fullPage a été testée
mais rejetée : l'en-tête collant s'y duplique au milieu de l'image). La barre de filtres reste
visible dans l'interface réelle, juste hors du cadre choisi pour cette capture précise.
