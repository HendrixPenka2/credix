# CREDIX — Cahier des charges pour la refonte design du frontend

> Document de référence à destination du designer chargé de refondre entièrement l'interface de CREDIX. Il décrit **tout ce qui existe aujourd'hui** dans l'application (pages, contenus, données, interactions) afin que la nouvelle proposition visuelle reste **fonctionnellement équivalente** et **facile à intégrer** par l'équipe backend/frontend déjà en place.
>
> **Seule contrainte de conservation : la page de connexion garde sa structure à 2 cadrants** (image/branding à gauche, formulaire à droite). **Tout le reste du design (couleurs, typographie, composants, mises en page, iconographie) est entièrement libre et à repenser.**

---

## 1. Le produit en une minute

**CREDIX** est une plateforme interne de **scoring de risque de crédit assisté par IA**, destinée à un établissement de microfinance/crédit. Elle sert à :

- évaluer automatiquement le risque de défaut d'un emprunteur (modèle LightGBM calibré) ;
- expliquer chaque score avec des facteurs SHAP en langage naturel (IA "explicable") ;
- détecter les profils atypiques via un second modèle (Isolation Forest / Autoencoder) qui peut forcer une revue manuelle même si le score initial est bon ;
- faire remonter les dossiers ambigus à un superviseur humain, qui tranche (override) ;
- surveiller la dérive statistique du modèle dans le temps (PSI) ;
- administrer les comptes, les seuils de décision et les versions du modèle.

C'est un **outil métier interne** (pas un produit grand public) : trois profils d'utilisateurs bien distincts s'y connectent, chacun avec son propre menu et ses propres écrans. Le ton visuel actuel est sobre, "corporate/fintech", proche des interfaces bancaires B2B (Stripe Dashboard, banques en ligne pro).

### Les 3 rôles utilisateurs (structurants pour toute l'IHM)

| Rôle | Qui | Ce qu'il fait dans l'app |
|---|---|---|
| **AGENT** | Agent de crédit en agence | Recherche/crée des clients, lance des scorings, fait des simulations "what-if", consulte l'historique, télécharge des rapports PDF |
| **SUPERVISEUR** | Superviseur risque | Traite la file des dossiers en revue manuelle (accepte/refuse avec justification), surveille le portefeuille et la santé du modèle IA |
| **ADMIN** | Administrateur plateforme | Gère les comptes utilisateurs, configure les seuils de décision, gère les versions du modèle IA (upload/promotion), consulte le journal d'audit |

Chaque rôle a **sa propre sidebar de navigation** et **son propre jeu de pages** — un agent ne voit jamais les écrans d'un superviseur ou d'un admin, et inversement. C'est la première décision structurante que le designer doit intégrer : **ce n'est pas une seule app avec des permissions, ce sont trois espaces de travail distincts partageant une coquille commune (topbar, sidebar, kit de composants).**

---

## 2. Lexique métier (vocabulaire que le designer va rencontrer partout)

| Terme | Signification |
|---|---|
| **Score PDO** | Score de crédit, échelle **300 à 850** (plus haut = moins risqué). C'est LA métrique vedette, affichée en jauge sur presque tous les écrans. |
| **PD** (`pd_c`) | Probabilité de défaut calibrée, en % (0-100%). Inversement corrélée au score. |
| **Décision** | `ACCORDÉ` (vert), `REFUSÉ` (rouge), `REVUE_MANUELLE` (ambre) — code couleur omniprésent, à conserver conceptuellement. |
| **ρc (rho couverture)** | Taux de complétude des données déclarées par le client (0-100%). Sous 25% = "critique" (revue forcée), 25-40% = "partielle" (à enrichir), ≥40% = "suffisante". Deuxième métrique vedette, affichée en anneau/jauge. |
| **SHAP** | Les 3 à 5 variables qui expliquent le plus le score d'un client, avec un sens (aggravant/atténuant), un poids %, et une phrase en langage naturel. C'est le cœur de "l'IA explicable" du produit — doit rester très lisible et pédagogique dans la refonte. |
| **Anomalie / "Flux B"** | Un second modèle détecte les profils statistiquement atypiques. S'il détecte une anomalie sur un dossier que le premier modèle voulait accorder, il **force une revue manuelle** ("interception"/"escalade"). Notion à bien distinguer visuellement de la décision "normale". |
| **PSI** (Population Stability Index) | Mesure la dérive du modèle IA dans le temps par rapport aux données d'entraînement. `<0.10` = stable (vert), `0.10-0.25` = attention (ambre), `≥0.25` = dérive (rouge). |
| **Override** | Décision manuelle d'un superviseur qui remplace la recommandation IA sur un dossier en revue. |
| **Version de modèle** | Le modèle IA a un cycle de vie : `STAGING` (nouvelle version testée) → `PRODUCTION` (active) → `ARCHIVE` (remplacée). Une seule version en production à la fois. |

**Code couleur sémantique constant dans toute l'app actuelle** (à faire évoluer mais dont la logique métier doit être conservée) :
- 🟢 Vert/émeraude = succès, accordé, stable, actif, production
- 🟠 Ambre = attention, en revue, en attente, staging
- 🔴 Rouge/rose = danger, refusé, dérive critique, inactif, échec
- 🔵 Bleu = marque, action principale, liens
- ⚪ Gris/neutre = lecture seule, désactivé, donnée insuffisante

---

## 3. Repères du système visuel actuel (pour cadrer l'écart de style attendu)

Utile au designer pour savoir **d'où on part** — à ne pas reproduire, juste pour référence :

- Palette : neutre slate, marque bleu, sémantique emerald/rose/amber/sky/violet (superviseur = violet).
- Rayons d'angle disciplinés : contrôles 8px, cartes/tableaux/modales 12px, badges/avatars en pilule.
- Cartes très sobres (bordure fine + légère ombre en light, pas d'ombre en dark).
- Mode sombre complet et systématique (toggle manuel, pas d'auto système).
- Typographie Inter, très factuelle (peu de hiérarchie visuelle forte, beaucoup de texte gris moyen).
- Iconographie Lucide uniquement, aucune illustration, aucun emoji.
- Beaucoup de mini-visualisations "faites main" (jauges demi-cercle, anneaux, barres SHAP) plutôt que de vrais composants de dataviz aboutis.
- Beaucoup de motifs répétés mais non factorisés visuellement : cartes KPI, listes "avatar + nom + badge", empty states, headers de page identiques partout (icône carrée + titre + sous-titre).

**Piste de brief pour le designer** : le produit a une bonne cohérence fonctionnelle mais un habillage plat et peu différenciant. Il y a une vraie opportunité de lui donner une identité visuelle forte (une jauge de score plus impactante, une hiérarchie typographique plus marquée, une vraie palette de dataviz, des états vides plus travaillés) sans rien perdre de la densité d'information nécessaire à des utilisateurs métier qui passent des heures par jour dessus.

---

## 4. Architecture de navigation

### Coquille commune à conserver conceptuellement (contenu libre)
- **Sidebar gauche fixe** : logo produit, bloc utilisateur connecté (avatar + nom + rôle), navigation groupée par thème (les groupes changent selon le rôle), bouton déconnexion en bas.
- **Topbar** : fil d'Ariane / titre de page, recherche globale de clients, notifications (superviseur/admin uniquement — nombre de dossiers en attente), bascule thème clair/sombre.
- **Zone de contenu** scrollable à droite.

### Plan de site complet (36 routes)

**Public**
- `/` → redirection technique vers `/login` (pas un écran)
- `/login` → **à conserver en structure (2 cadrants)**, contenu/style libre

**Espace AGENT** (7 pages)
- `/dashboard` — Tableau de bord agent
- `/clients` — Recherche/liste clients
- `/clients/nouveau` — Création d'un client
- `/clients/[id]` — Fiche client (hub à 6 onglets)
- `/score` — Nouveau scoring
- `/simul` — Simulateur what-if
- `/hist` — Historique de scoring
- `/rep` — Mes rapports PDF

**Espace SUPERVISEUR** (8 pages)
- `/superviseur` — Vue d'ensemble portefeuille
- `/superviseur/revue` — Dossiers en revue (écran central du métier)
- `/superviseur/mes-validations` — Historique de mes décisions
- `/superviseur/distribution` — Distribution des scores
- `/superviseur/tranches` — Tranches de risque
- `/superviseur/modele/derive` — Dérive globale PSI
- `/superviseur/modele/variables` — Dérive par variable
- `/superviseur/modele/versions` — Versions du modèle (lecture seule)

**Espace ADMIN** (9 pages)
- `/admin` — Vue générale
- `/admin/utilisateurs` — Liste des comptes
- `/admin/utilisateurs/nouveau` — Création de compte
- `/admin/configuration` — Seuils PDO & ρc
- `/admin/modeles` — Versions du modèle (upload + promotion)
- `/admin/modeles/derive` — Dérive globale PSI
- `/admin/modeles/variables` — Dérive par variable
- `/admin/audit` — Journal d'audit

Les pages `/clients`, `/clients/[id]` sont **partagées entre les 3 rôles** (avec le même contenu). Les triplets "dérive globale / dérive variable / versions" sont **strictement identiques visuellement entre superviseur et admin** (seule différence : l'admin peut agir — promouvoir/uploader — le superviseur est en lecture seule).

---

## 5. Catalogue détaillé des pages

### 5.1 — Connexion — `/login` *(structure à conserver)*

Panneau gauche (desktop uniquement, masqué en mobile) : image plein cadre avec overlay dégradé sombre, logo produit, accroche marketing courte, footer institutionnel. Panneau droit : formulaire centré verticalement — identifiant, mot de passe (avec bouton afficher/masquer), message d'erreur en cas d'échec, bouton de connexion pleine largeur, indicateur "backend connecté", bascule de thème. **Redirection automatique après connexion selon le rôle** (agent → dashboard, superviseur → vue portefeuille, admin → vue générale).

*Le designer peut retravailler entièrement les couleurs, la typographie, l'image, le contenu du panneau gauche — seule la logique en 2 cadrants (visuel à gauche / formulaire à droite) est à conserver.*

---

### 5.2 — Espace AGENT

#### `/dashboard` — Tableau de bord agent
Vue d'activité personnelle avec sélecteur de période (7/30/90 jours). Contenu : 4 cartes de statistiques (dossiers scorés, accordés, en revue, refusés — chacune avec un %), un bloc "détection d'anomalie" mis en avant (dossiers analysés / profils atypiques / dossiers interceptés + comparaison score moyen vs seuil), un histogramme de distribution des scores par tranche, 4 raccourcis d'action ("nouveau scoring", "simulateur", "nouveau client", "rechercher"), une liste des 6 derniers clients scorés et une liste des clients à dossier incomplet ("thin-file", ρc < 40%) à relancer.

#### `/clients` — Recherche / liste clients
Barre de recherche texte + filtres combinables (par niveau de couverture ρc, par dernière décision). Sans recherche active : liste des 10 derniers clients scorés par défaut. Résultat sous forme de tableau (avatar, nom, identifiant, emploi, couverture ρc, dernier score + décision). État vide avec proposition de créer directement le client recherché.

#### `/clients/nouveau` — Création d'un client
Formulaire déclaratif en 3 blocs thématiques : identité civile (prénom, nom, naissance, genre, situation familiale, enfants, téléphone, agence), profil professionnel (type de poste parmi ~20 métiers, type de revenu, niveau d'éducation), ancienneté déclarative (emploi et domicile, en mois avec équivalent en années affiché). Validation des champs obligatoires, gestion du cas "client déjà existant".

#### `/clients/[id]` — Fiche client (hub à 6 onglets)
Écran central de la relation client. En-tête : identité, indicateur de couverture ρc, tags de profil, actions rapides (nouveau scoring / simuler / modifier le profil). Bannières contextuelles au-dessus (nouveau client sans historique / couverture critique / couverture partielle). Six onglets :
1. **Vue d'ensemble** — dernier score (jauge), décision, couverture (anneau), métriques clés, alerte si interception par détection d'anomalie.
2. **Nouveau scoring** — formulaire de scoring intégré (même moteur que `/score`).
3. **Simulation** — formulaire what-if intégré (même moteur que `/simul`).
4. **Historique** — courbes d'évolution du score et de la couverture + tableau chronologique dépliable avec SHAP par ligne et téléchargement PDF.
5. **Explicabilité (XAI)** — détail des 5 facteurs SHAP du dernier scoring.
6. **Progression** — statistiques d'évolution (delta score, delta ρc, tendances) + 2 courbes temporelles + résumé textuel.

Une modale "Modifier le profil" permet d'éditer les champs modifiables (ancienneté, emploi, revenu, éducation) en gardant les champs immuables (naissance, genre, identifiant) en lecture seule.

#### `/score` — Nouveau scoring
Parcours en 3 étapes sur une même page (sélection client → formulaire de données de la demande + profil emprunteur → résultat). Le résultat affiche : jauge de score + décision, anneau de couverture + recommandation de documents à collecter si besoin, positionnement en percentile, bloc "analyse de profil / détection d'anomalie" (avec alerte visible si le dossier a été intercepté), et les 5 facteurs SHAP explicatifs. Actions : télécharger le rapport PDF, relancer une simulation, recommencer.

#### `/simul` — Simulateur what-if
Même parcours en 3 étapes que le scoring, mais **thématiquement différencié** (aujourd'hui : accent ambre au lieu de bleu, bannière permanente "résultat non enregistré") pour qu'on ne puisse jamais confondre une simulation avec un vrai scoring. Résultat présenté en **comparaison** : scénario simulé vs dernier score réel du client, avec deltas chiffrés (score, PD) et indicateurs de tendance. Pas d'export PDF (cohérent avec le caractère non officiel).

#### `/hist` — Historique de scoring
Sélection d'un client puis affichage de 4 statistiques résumées, deux courbes temporelles (score et ρc, avec lignes de seuil de référence) et un tableau chronologique complet dépliable (SHAP + PDF par ligne).

#### `/rep` — Mes rapports PDF
Liste plate (sans graphique) de toutes les décisions produites par l'agent connecté, filtrable par période (7/30/90 jours/tout), avec téléchargement PDF par ligne. La page la plus "sobre" du produit, purement tabulaire.

---

### 5.3 — Espace SUPERVISEUR

#### `/superviseur` — Vue d'ensemble portefeuille
Tableau de bord de pilotage : bannière d'alerte si le portefeuille dépasse un seuil de risque configuré, 8 cartes KPI (dossiers scorés, PD moyenne/médiane, taux thin-file, dossiers en attente, score moyen, taux d'accord, dossiers interceptés par anomalie, mes validations), graphique de volume, file des 3 dossiers les plus urgents en attente, barre empilée des décisions (accordé/revue/refusé), bloc de santé du modèle IA en production (statut PSI, AUC, Gini).

#### `/superviseur/revue` — Dossiers en revue *(écran central du métier)*
Layout à 2 zones : une **liste de la file d'attente** à gauche (triée du plus ancien au plus récent, avec aperçu score/ρc/SHAP et badge "interceptée" si anomalie), et à droite le **détail complet du dossier sélectionné** : profil emprunteur, données de la demande, jauge de score, anneau de couverture, bloc d'analyse de profil/anomalie, recommandation de complétude si nécessaire, les 5 facteurs SHAP détaillés, un panneau repliable listant *toutes* les variables brutes utilisées par le modèle. En bas, le **formulaire de décision** : bascule ACCORDÉ/REFUSÉ, commentaire justificatif obligatoire (min. 20 caractères, compteur live), bouton de validation. Gestion du cas de conflit (dossier déjà tranché par un collègue entre-temps).

*C'est l'écran le plus dense et le plus critique de toute l'application — celui qui mérite le plus de soin dans la refonte : beaucoup d'information à hiérarchiser sans surcharger, et une action de décision qui doit être rassurante et sans ambiguïté.*

#### `/superviseur/mes-validations` — Historique de mes décisions
Lecture seule : 4 KPI (dossiers en revue, dossiers tranchés, taux d'accord, taux de désaccord avec le modèle), un donut de répartition accordé/refusé, un texte d'auto-évaluation ("mes seuils sont-ils trop stricts ou trop laxistes ?"), et un tableau de tout l'historique de mes overrides.

#### `/superviseur/distribution` — Distribution des scores
Histogramme de la répartition des scores du portefeuille sur la période, avec les 3 zones colorées (refus/revue/accord) et leurs seuils actifs, plus 3 cartes récapitulatives par zone.

#### `/superviseur/tranches` — Tranches de risque
Test de cohérence de la calibration du modèle ("la PD doit décroître quand le score augmente") : bandeau de résultat du test, et un tableau détaillé par tranche de score (dossiers, % portefeuille, PD moyenne, score moyen, ρc moyen, répartition des décisions).

#### `/superviseur/modele/derive` — Dérive globale PSI
Une grande jauge segmentée (stable/attention/dérive) affichant l'indice PSI actuel, les statistiques de calcul (taille des échantillons de référence/actuel, date), et un bloc pédagogique expliquant comment lire le PSI.

#### `/superviseur/modele/variables` — Dérive par variable
5 cartes de synthèse (statut global, nb en dérive/attention/stable/insuffisant) puis un tableau des ~27 variables du modèle triées par PSI décroissant, avec mini-barre de progression par ligne.

#### `/superviseur/modele/versions` — Versions du modèle (lecture seule)
Tableau de l'historique des versions du modèle (nom, statut, AUC/Gini/KS, dates), avec la version en production mise en avant. Aucune action possible ici (contrairement à l'équivalent admin).

---

### 5.4 — Espace ADMIN

#### `/admin` — Vue générale
4 KPI (agents actifs, superviseurs actifs, modèle en production, versions en attente de promotion) + tableau des versions du modèle avec action de promotion directement accessible, et bouton d'upload d'un nouveau modèle.

#### `/admin/utilisateurs` — Liste des comptes
Recherche + filtre par rôle, tableau de tous les comptes (identité, rôle, agence, statut actif/inactif, dernière connexion), action d'activation/désactivation par ligne avec modale de confirmation (compte jamais supprimé, action réversible).

#### `/admin/utilisateurs/nouveau` — Création de compte
Formulaire en 2 blocs : identité (prénom, nom, email, agence) et compte & accès (choix du rôle parmi 3 boutons larges colorés, identifiant, mot de passe + confirmation avec validation live). Écran de confirmation dédié après création.

#### `/admin/configuration` — Seuils PDO & ρc
Deux formulaires : seuils de décision (refusé/accordé, avec visualisation immédiate des 3 zones résultantes avant sauvegarde) et seuil d'alerte PD du portefeuille (slider + champ numérique). Colonne latérale récapitulant en clair la règle de décision appliquée, et rappelant en lecture seule les seuils ρc (non modifiables depuis l'interface).

#### `/admin/modeles` — Versions du modèle (gestion complète)
Identique à `/superviseur/modele/versions` mais avec actions : upload d'une nouvelle version (modale avec nom, métriques optionnelles, description, et **14 fichiers d'artefacts techniques** répartis en 4 groupes — pipeline LightGBM, calibration/décision, prétraitement + Isolation Forest, Autoencoder) et promotion d'une version en production (modale de confirmation avertissant que l'ancienne version sera archivée et l'effet est immédiat sur tous les scorings à venir).

#### `/admin/modeles/derive` et `/admin/modeles/variables`
Identiques en tout point aux pages équivalentes côté superviseur (mêmes composants), simplement accessibles depuis le menu admin.

#### `/admin/audit` — Journal d'audit
Filtres par type d'action et par identifiant utilisateur. Tableau chronologique de toutes les actions de la plateforme (horodatage, utilisateur, rôle, action, ressource concernée, statut succès/échec), lignes dépliables affichant l'adresse IP et le détail JSON brut de l'action. Pagination incrémentale ("charger plus").

---

## 6. Composants et patterns transverses à repenser

Ces éléments reviennent sur presque toutes les pages — leur redesign a un effet multiplicateur sur toute l'app, à prioriser dans le travail du designer :

1. **Badge de décision** (ACCORDÉ / REFUSÉ / REVUE_MANUELLE) — apparaît des dizaines de fois, doit rester instantanément lisible.
2. **Jauge de score** (300-850) et **anneau/jauge de couverture ρc** — les deux visualisations signature du produit, actuellement de simples détournements de donut chart. Belle opportunité de leur donner une identité graphique forte.
3. **Bloc explicatif SHAP** — liste de facteurs avec direction (aggravant/atténuant), poids, et phrase en langage naturel. Actuellement une liste de barres ; un vrai *waterfall chart* serait plus lisible pour montrer comment le score se construit.
4. **Carte KPI / StatCard** — label + valeur + icône + tendance, répétée en grille sur presque tous les dashboards.
5. **Liste "avatar + nom + badge" cliquable** — utilisée pour les listes de clients/dossiers récents partout.
6. **Sélecteur de client avec recherche debouncée** — brique réutilisée sur scoring/simulation/historique.
7. **États systématiques à prévoir pour chaque écran** : chargement (spinner/skeleton), erreur (message + réessayer), vide (icône + message + action), succès (toast/bannière).
8. **Tableaux de données denses** avec lignes dépliables (historique, audit) — pattern à conserver fonctionnellement, à moderniser visuellement.
9. **Formulaire "wizard" en 3 étapes** (scoring et simulation) — même structure, juste une différenciation de couleur d'accent aujourd'hui ; le designer peut proposer une distinction plus forte et plus intuitive entre "action réelle" et "action de test".
10. **Sidebar par rôle** et **topbar** (recherche globale + notifications + thème) — coquille commune aux 24 pages internes.
11. **Modales de confirmation** (désactiver un compte, promouvoir un modèle) — actions sensibles, doivent rester claires sur leurs conséquences.

---

## 7. Pages potentiellement manquantes à envisager avec le designer

L'inventaire ci-dessus reflète l'existant. Quelques pages n'existent pas aujourd'hui mais pourraient logiquement compléter le produit — à évoquer avec le designer pour savoir s'il doit les concevoir dès maintenant (gain d'intégration plus tard) :

- **Mon compte / Profil utilisateur** — aucune page ne permet aujourd'hui à un utilisateur connecté de changer son propre mot de passe ou de voir ses infos de compte.
- **Centre de notifications** — la cloche de la topbar ne fait que renvoyer vers la file de revue ; pas de vrai centre de notifications (alertes de dérive modèle, nouveaux dossiers assignés, etc.).
- **Page d'erreur 404 / accès refusé** — non identifiée dans l'exploration ; utile si un rôle tape l'URL d'un autre rôle.
- **Aide / documentation intégrée** — pas de FAQ ni de guide contextuel, alors que le vocabulaire (ρc, PSI, SHAP) est technique pour des utilisateurs métier.
- **Export / rapports consolidés** — au-delà du PDF par dossier, un export agrégé (ex. rapport mensuel du portefeuille) n'existe pas encore.
- **Comparaison multi-scénarios** dans le simulateur — aujourd'hui une seule simulation à la fois ; comparer plusieurs scénarios côte à côte pourrait être une évolution naturelle.

Ce ne sont **pas des exigences**, juste des pistes à trancher avec vous/le designer avant de lancer les maquettes, pour éviter un aller-retour d'intégration plus tard.

---

## 8. Livrables attendus du designer (suggestion de cadrage)

Pour que l'intégration soit "facile" comme demandé, il est recommandé de cadrer la mission du designer autour de :

1. Un **système de design** (palette, typographie, espacements, radius, ombres, mode clair/sombre, iconographie) — équivalent redessiné de la section 3.
2. Les **composants transverses** de la section 6, en variantes clair/sombre.
3. Les **maquettes de chaque page** listées en section 5 (idéalement en gardant la même arborescence de routes pour limiter le travail de re-branchement).
4. Le comportement **responsive** (l'app est aujourd'hui pensée desktop-first, à clarifier si le mobile/tablette est dans le périmètre).
5. Les **états** de chaque écran clé (vide/chargement/erreur), pas seulement l'état "rempli".

---

*Document généré à partir d'une exploration exhaustive du code source actuel (`credix/app`, `credix/components`, `credix/lib`) — reflète l'état réel de l'application au 10/08/2026.*

