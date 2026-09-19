# CREDIX AI — Fonctionnalités de l'application (credix-v2)

> Document de référence décrivant ce qui est **réellement construit et fonctionnel** dans le nouveau frontend `credix-v2/`, connecté en direct au backend FastAPI (`scoring-backend/`). Mis à jour au fil de la construction — reflète l'état après les Phases 0, 1, 2 et 3 (Phase 4 "polish" restante).

---

## 1. Le produit en une minute

**CREDIX** est une plateforme interne de **scoring de risque de crédit assisté par IA**, destinée à un établissement de microfinance/crédit. Elle permet de :

- évaluer automatiquement le risque de défaut d'un emprunteur (modèle LightGBM calibré) et produire un **score PDO (300–850)** ;
- **expliquer** chaque score avec les facteurs SHAP qui l'ont le plus influencé, en langage naturel ;
- détecter les profils statistiquement atypiques via un second modèle (**Flux B** — autoencodeur / Isolation Forest), qui peut forcer une revue manuelle même si le score initial était favorable ;
- faire remonter les dossiers ambigus à un **superviseur humain**, qui tranche (override) avec justification ;
- surveiller la **dérive statistique** du modèle dans le temps (indice PSI, global et par variable) ;
- **administrer** les comptes utilisateurs, les seuils de décision et le cycle de vie des versions du modèle.

Trois profils d'utilisateurs bien distincts s'y connectent, chacun avec sa propre navigation et ses propres écrans : **Agent**, **Superviseur**, **Administrateur**. Ce n'est pas une seule app avec des permissions — ce sont trois espaces de travail distincts partageant une coquille commune (barre latérale, barre supérieure, kit de composants visuels).

---

## 2. Ce qui est transverse aux 3 espaces

- **Connexion** (`/login`) — écran à 2 volets (image de marque à gauche, formulaire à droite), redirection automatique vers l'espace du rôle après connexion.
- **Thème clair / sombre** — bascule manuelle (icône lune/soleil), mode sombre en **noir réel** (pas du gris-bleu), mode clair en fond quasi blanc. Le choix est respecté sur toutes les pages.
- **Recherche globale de clients** — barre de recherche dans la barre supérieure, disponible pour les 3 rôles, ouvre directement la fiche du client trouvé.
- **Notifications** — cloche dans la barre supérieure (Superviseur et Admin uniquement), affiche en temps réel le nombre de dossiers en attente de revue, cliquable vers la file de revue.
- **Détection d'anomalie (Flux B) toujours visible** — partout où un score existe (nouveau scoring, simulation, historique, fiche client, revue superviseur, liste "Mes rapports"), un bloc dédié affiche : le score d'anomalie, le détecteur utilisé (autoencodeur / Isolation Forest), le percentile de référence, et — quand disponible — les facteurs qui expliquent pourquoi le profil a été jugé atypique.
- **Explicabilité (SHAP)** — chaque score est accompagné des facteurs qui l'ont le plus influencé, présentés comme des mini-barres avec une phrase en langage naturel (pas juste un chiffre technique).
- **États systématiques** — chargement (squelettes animés), erreur (message + bouton réessayer), vide (icône + message + action proposée), sur la quasi-totalité des écrans.

---

## 3. Espace AGENT (agent de crédit en agence)

**Rôle :** recherche/crée des clients, lance des scorings, fait des simulations, consulte l'historique, télécharge les rapports PDF.

| Page | Fonctionnalités |
|---|---|
| **Tableau de bord** (`/dashboard`) | Sélecteur de période (7/30/90 jours). 4 cartes de statistiques (dossiers scorés, accordés, en revue, refusés). Bloc "Interceptions IA" mettant en avant les dossiers interceptés par le Flux B. Histogramme de distribution des scores (coloré par zone refus/revue/accord). 4 raccourcis d'action. Liste des 6 derniers clients scorés. Liste des clients à dossier incomplet (ρc < 40 %) à relancer. |
| **Recherche clients** (`/clients`) | Recherche texte + filtres combinables (couverture ρc, dernière décision). Sans recherche active : les 10 derniers clients scorés. Résultats en tableau avec badge de couverture et badge de décision. État vide proposant de créer directement le client recherché. |
| **Nouveau client** (`/clients/nouveau`) | Formulaire en 3 blocs : identité civile, profil professionnel, ancienneté déclarative (avec équivalent en années affiché). Validation des champs obligatoires, gestion du cas "client déjà existant". |
| **Fiche client** (`/clients/[id]`) | Écran central de la relation client, **6 onglets** : <br>• **Vue d'ensemble** — dernier score, décision, couverture, facteurs SHAP principaux, alerte si interception par anomalie, profil, scorings récents.<br>• **Nouveau scoring** — même moteur que la page dédiée, client pré-sélectionné.<br>• **Simulation** — même moteur que la page dédiée, client pré-sélectionné.<br>• **Historique** — courbes d'évolution + tableau chronologique dépliable.<br>• **Explicabilité** — détail complet des 5 facteurs SHAP + analyse d'anomalie du dernier scoring.<br>• **Progression** — delta score/couverture, tendances, repères premier/dernier scoring.<br>Bannières contextuelles (nouveau client sans historique, couverture critique/partielle). Modale "Modifier le profil" pour les champs déclaratifs modifiables. |
| **Nouveau scoring** (`/score`) | Parcours en 3 étapes : sélection du client → formulaire de données de la demande (entièrement piloté par le schéma renvoyé par le backend) → résultat. Résultat : jauge de score, décision, anneau de couverture + recommandations de documents à collecter, positionnement en percentile, 5 facteurs SHAP, bloc d'anomalie complet. Actions : télécharger le PDF, lancer une simulation, recommencer. |
| **Simulateur what-if** (`/simul`) | Même parcours, thème orange permanent ("résultat non enregistré") pour ne jamais confondre avec un vrai scoring. Résultat en **comparaison** : dernier score réel vs scénario simulé, avec deltas chiffrés. Pas d'export PDF (cohérent avec le caractère non officiel). |
| **Historique** (`/hist`) | Sélection d'un client, puis : 4 statistiques résumées, 2 courbes temporelles (score et couverture, avec lignes de seuil), tableau chronologique complet à lignes dépliables (SHAP + anomalie + téléchargement PDF par ligne). |
| **Mes rapports** (`/rep`) | Liste plate de toutes les décisions de l'agent connecté, filtrable par période, avec badge d'anomalie et téléchargement PDF par ligne. |

---

## 4. Espace SUPERVISEUR (superviseur risque)

**Rôle :** traite la file des dossiers en revue manuelle (accepte/refuse avec justification), surveille le portefeuille et la santé du modèle IA.

| Page | Fonctionnalités |
|---|---|
| **Vue d'ensemble** (`/superviseur`) | Bannière d'alerte si le portefeuille dépasse le seuil de risque configuré. 8 cartes KPI (dossiers scorés, PD moyenne/médiane, taux thin-file, dossiers en attente, score moyen, taux d'accord, dossiers interceptés par anomalie, mes validations). File des 3 dossiers les plus urgents. Barre de répartition des décisions. Carte "Santé du modèle IA" (statut PSI, AUC, Gini), cliquable vers le détail de la dérive. |
| **Dossiers en revue** (`/superviseur/revue`) — **écran central du métier** | Liste filtrable (Tous / Anomalies) triée du plus ancien au plus récent, avec aperçu score/couverture/badge "Interceptée". Détail complet du dossier sélectionné : jauges score + couverture, analyse d'anomalie complète, profil emprunteur, données de la demande, 5 facteurs SHAP détaillés, panneau repliable listant toutes les variables brutes utilisées par le modèle. Formulaire de décision : bascule Accordé/Refusé, commentaire justificatif obligatoire (20 caractères min., compteur en direct), gestion du conflit si le dossier a été tranché entre-temps par un collègue. |
| **Mes validations** (`/superviseur/mes-validations`) | Lecture seule : 4 KPI (dossiers en revue, tranchés, taux d'accord, taux de désaccord avec le modèle), donut de répartition accordé/refusé, texte d'auto-évaluation généré par le backend, tableau complet de l'historique des décisions. |
| **Distribution des scores** (`/superviseur/distribution`) | Histogramme du portefeuille avec les seuils PDO réellement actifs, 3 cartes récapitulatives par zone (refus/revue/accord) avec PD moyenne. |
| **Tranches de risque** (`/superviseur/tranches`) | Test de cohérence de la calibration (la PD doit décroître quand le score augmente) — bandeau de résultat automatique. Tableau détaillé par tranche de score. |
| **Dérive globale — PSI** (`/superviseur/modele/derive`) | Jauge segmentée (stable/attention/dérive) avec aiguille, statistiques des échantillons de référence/actuel, bloc pédagogique expliquant comment lire le PSI. |
| **Dérive par variable** (`/superviseur/modele/variables`) | 5 cartes de synthèse (total/stable/attention/dérive/insuffisant), tableau des ~27 variables du modèle triées par PSI décroissant. |
| **Versions du modèle** (`/superviseur/modele/versions`) | Lecture seule. Mise en avant de la version en production (AUC/Gini/KS), tableau de l'historique complet des versions. |

---

## 5. Espace ADMIN (administrateur plateforme)

**Rôle :** gère les comptes utilisateurs, configure les seuils de décision, gère les versions du modèle IA, consulte le journal d'audit.

| Page | Fonctionnalités |
|---|---|
| **Vue générale** (`/admin`) | 4 KPI (agents actifs, superviseurs actifs, modèle en production, versions en attente de promotion). Tableau des versions du modèle avec promotion directement accessible. Carte d'activité récente basée sur le vrai journal d'audit. Bouton d'upload d'un nouveau modèle. |
| **Utilisateurs** (`/admin/utilisateurs`) | Recherche + filtre par rôle. Tableau de tous les comptes (identité, rôle, agence, statut, dernière connexion). Activation/désactivation par ligne avec modale de confirmation — **le compte n'est jamais supprimé**, l'action est réversible. |
| **Nouveau compte** (`/admin/utilisateurs/nouveau`) | Formulaire en 2 blocs : identité (prénom/nom/email/agence) et compte & accès (choix du rôle parmi 3 cartes visuelles, identifiant, mot de passe + confirmation avec validation en direct). Écran de confirmation dédié après création, avec l'identifiant généré. |
| **Configuration** (`/admin/configuration`) | Seuils de décision PDO (refusé/accordé) avec visualisation immédiate des 3 zones avant sauvegarde. Seuil d'alerte PD du portefeuille (slider + champ numérique). **Sensibilité de détection d'anomalie Flux B** (percentile 95/99 — ajouté pour permettre de réduire le taux d'interceptions si le modèle actuel est trop sensible). Colonne récapitulant en langage naturel la règle de décision active, et rappel en lecture seule des seuils de couverture ρc (non modifiables depuis l'interface). |
| **Modèles** (`/admin/modeles`) | Identique à la page superviseur, avec actions : **upload d'une nouvelle version** (modale avec nom, description, métriques optionnelles, et les **14 fichiers d'artéfacts techniques** répartis en 4 groupes — pipeline LightGBM, calibration/décision, prétraitement + Isolation Forest, Autoencodeur) et **promotion en production** (modale de comparaison avec la version actuelle, case de confirmation obligatoire, avertissement sur le caractère immédiat et irréversible). |
| **Dérive globale / Dérive par variable** (`/admin/modeles/derive`, `/admin/modeles/variables`) | Strictement identiques aux pages superviseur équivalentes (même écran, accessible depuis le menu admin). |
| **Journal d'audit** (`/admin/audit`) | Filtres par type d'action et par identifiant utilisateur. Tableau chronologique de toutes les actions de la plateforme, lignes dépliables affichant l'adresse IP et le détail JSON brut. Pagination incrémentale ("Charger plus"). |

---

## 6. Ce qui n'est pas (encore) fait

- **Phase 4 — polish transverse** : passe responsive complète, audit systématique des états vide/erreur sur chaque écran, cohérence finale clair/sombre.
- **Retouches Phase 1 (Agent)** demandées par vous et pas encore traitées au-delà des 4 déjà corrigées (mise en page centrée, blocs côte à côte, largeur des cartes de sélection client).
- Aucune fonctionnalité n'a été retirée du cahier des charges initial ; les 3 pages qui n'avaient pas de maquette dédiée (`/rep`, `/superviseur/distribution`, `/superviseur/tranches`) ont été conçues avec les mêmes composants que le reste de l'app.

---

## 7. Accès de test

Backend et frontend tournent en local :
- Backend : `http://localhost:8080`
- Frontend (celui décrit ici) : `http://localhost:3001`

Aucun mot de passe n'est écrit dans ce dépôt. Le premier compte administrateur se crée avec `scoring-backend/scripts/create_admin.py` (procédure complète dans le `README.md` à la racine du dépôt). Les comptes Agent et Superviseur se créent ensuite depuis l'espace Admin, page « Utilisateurs ».
