# Captures d'écran à prendre

**Liste numérotée de toutes les captures d'écran à fournir pour le dossier de remise.**

Ce fichier est un **outil de travail** pour l'auteur : il n'est pas à envoyer à l'encadrant.

## Comment procéder

1. **Prenez la capture** (section « Astuces » ci-dessous).
2. **Nommez le fichier exactement** comme dans la colonne « Nom du fichier » (les majuscules et les tirets comptent).
3. **Déposez-le** dans le bon dossier :
   - captures du README : `docs/images/readme/`
   - captures des guides : `docs/images/guides/`
4. **Cochez** la case de la ligne.
5. **Refaites les PDF** avec une seule commande (depuis la racine du dépôt) :

   ```bash
   docs/build/build_all.sh
   ```

   Les cadres « CAPTURE À INSÉRER » sont alors remplacés par vos images.

   Vous pouvez aussi **recompiler vous-même le fichier `.tex`** d'un seul document (dossier `docs/tex/`) : chaque image y est un bloc `\begin{figure}` avec `\includegraphics{nom-du-fichier}` ; il suffit de changer le nom du fichier. Voir `docs/tex/LISEZMOI.md` et le guide 4, section 8.3.

**Priorité :** **A** = indispensable pour la démonstration ; **B** = utile, à faire si le temps le permet.

---

## Astuces pour prendre de bonnes captures

- **Format PNG**, fenêtre large (au moins 1 200 pixels de large). Sous Ubuntu, la touche `Impr écran` enregistre l'écran ; `Maj` + `Impr écran` permet de choisir une zone ; les fichiers arrivent dans `Images/Captures d'écran`.
- **Cachez ce qui est personnel ou secret** : adresse e-mail, clé d'API, jeton d'accès GitHub, mot de passe, contenu d'un fichier `.env`. En cas de doute, floutez ou recadrez.
- **Une capture = une idée.** Recadrez sur la zone utile (menu, panneau) plutôt que d'envoyer l'écran entier quand ce n'est pas nécessaire.
- **Mode clair** de préférence : c'est plus lisible sur papier et en PDF.
- **Les captures doivent montrer un état réel**, pas un montage. Si un menu est différent de la description, gardez la capture réelle : le texte se corrige plus facilement que l'image.

---

## 1. README (3 captures : fournies le 19 septembre 2026)

Les trois captures ont été prises sur l'application qui tourne (README, section 6) et déposées dans `docs/images/readme/`. Cette section est faite ; elle reste ici pour mémoire.

| ID | Priorité | Ce qu'il faut montrer | Nom du fichier | Fait |
|---|---|---|---|---|
| R-01 | **A** | Espace **Agent** connecté : page principale (tableau de bord) | `docs/images/readme/01_espace_agent.png` | ☑ |
| R-02 | **A** | Espace **Superviseur** connecté : page principale (vue d'ensemble) | `docs/images/readme/02_espace_superviseur.png` | ☑ |
| R-03 | **A** | Espace **Administrateur** connecté : page principale (vue générale) | `docs/images/readme/03_espace_admin.png` | ☑ |

---

## 2. Guide 1 : les outils Claude (20 captures)

| ID | Priorité | Ce qu'il faut montrer | Nom du fichier | Fait |
|---|---|---|---|---|
| 01-01 | B | Page d'accueil de **claude.ai** (avant connexion ou page d'accueil du compte) | `docs/images/guides/01-01_claude_ai_accueil.png` | ☐ |
| 01-02 | B | Page des **abonnements** (Gratuit, Pro, Max…) avec les prix visibles | `docs/images/guides/01-02_claude_ai_tarifs.png` | ☐ |
| 01-03 | **A** | Menu du **profil, en bas à gauche**, ouvert (avec l'entrée Paramètres) | `docs/images/guides/01-03_menu_profil.png` | ☐ |
| 01-04 | **A** | **Paramètres, onglet Utilisation** : barres de la session en cours et de la limite hebdomadaire, heure de remise à zéro | `docs/images/guides/01-04_parametres_utilisation.png` | ☐ |
| 01-05 | B | Une **nouvelle conversation** avec une question et la réponse de Claude | `docs/images/guides/01-05_nouveau_chat.png` | ☐ |
| 01-06 | B | Le **menu d'outils** de la zone de saisie (recherche web, réflexion étendue, recherche approfondie) | `docs/images/guides/01-06_outils_recherche.png` | ☐ |
| 01-07 | **A** | **Liste des projets**, avec le bouton « Nouveau projet » | `docs/images/guides/01-07_liste_projets.png` | ☐ |
| 01-08 | **A** | **Création d'un projet** : nom et description | `docs/images/guides/01-08_creation_projet.png` | ☐ |
| 01-09 | **A** | Les **instructions du projet** (le texte de consignes de CREDIX, ou un extrait) | `docs/images/guides/01-09_instructions_projet.png` | ☐ |
| 01-10 | **A** | La **base de connaissances** avec le bouton d'ajout de fichiers | `docs/images/guides/01-10_ajout_fichiers.png` | ☐ |
| 01-11 | B | Une **conversation à l'intérieur d'un projet** (le nom du projet est visible) | `docs/images/guides/01-11_conversation_projet.png` | ☐ |
| 01-12 | **A** | VS Code, vue **Extensions**, recherche « Claude Code » | `docs/images/guides/01-12_vscode_recherche_extension.png` | ☐ |
| 01-13 | **A** | Page de l'**extension officielle** (badge de vérification, éditeur Anthropic) avec le bouton **Installer** | `docs/images/guides/01-13_vscode_installer.png` | ☐ |
| 01-14 | **A** | L'**icône d'étincelle** de Claude Code dans VS Code (barre d'outils de l'éditeur et barre d'activité) | `docs/images/guides/01-14_vscode_icone_etincelle.png` | ☐ |
| 01-15 | **A** | Le **panneau Claude Code** ouvert dans VS Code, à sa première ouverture | `docs/images/guides/01-15_vscode_panneau_ouvert.png` | ☐ |
| 01-16 | B | La **fenêtre de connexion** dans le navigateur (masquez l'adresse e-mail) | `docs/images/guides/01-16_connexion_navigateur.png` | ☐ |
| 01-17 | **A** | Une **première question** posée à Claude Code, avec sa réponse | `docs/images/guides/01-17_premiere_question.png` | ☐ |
| 01-18 | **A** | L'**indicateur de mode** en bas de la zone de saisie, avec la liste des modes ouverte | `docs/images/guides/01-18_modes_permission.png` | ☐ |
| 01-19 | **A** | Un **plan** proposé en mode Plan, affiché comme document Markdown commentable | `docs/images/guides/01-19_mode_plan_document.png` | ☐ |
| 01-20 | **A** | Les **options d'approbation du plan** (trois réponses proposées) | `docs/images/guides/01-20_mode_plan_approbation.png` | ☐ |

---

## 3. Guide 2 : la méthode de conception (4 captures)

Ces captures viennent de **votre vrai projet** CREDIX : elles prouvent la méthode.

| ID | Priorité | Ce qu'il faut montrer | Nom du fichier | Fait |
|---|---|---|---|---|
| 02-01 | **A** | La **base de connaissances** du projet CREDIX avec les documents chargés (liste des fichiers visible) | `docs/images/guides/02-01_base_connaissances.png` | ☐ |
| 02-02 | B | Un **rapport de recherche approfondie** avec ses citations (par exemple sur le seuil de valeurs manquantes) | `docs/images/guides/02-02_recherche_approfondie.png` | ☐ |
| 02-03 | **A** | Un **extrait du registre des décisions** (une décision avec son niveau de preuve) | `docs/images/guides/02-03_registre_decisions.png` | ☐ |
| 02-04 | **A** | **Claude Code en mode Plan** : le plan de réalisation produit à partir d'un document de conception | `docs/images/guides/02-04_plan_todo.png` | ☐ |

---

## 4. Guide 4 : les autres fonctions de Claude (6 captures)

Les captures 04-02 et 04-03 se prennent en **suivant la recette PDF vers PowerPoint** du guide 4 (section 3) : c'est aussi le meilleur moyen de **l'essayer avant la démonstration**.

| ID | Priorité | Ce qu'il faut montrer | Nom du fichier | Fait |
|---|---|---|---|---|
| 04-01 | B | **Paramètres, onglet Capacités** : l'option « Code execution and file creation » | `docs/images/guides/04-01_parametres_capacites.png` | ☐ |
| 04-02 | B | Un **PDF joint** à une conversation (nom du fichier visible) | `docs/images/guides/04-02_pdf_joint.png` | ☐ |
| 04-03 | **A** | Le **diaporama produit**, ouvert dans PowerPoint ou LibreOffice Impress | `docs/images/guides/04-03_resultat_pptx.png` | ☐ |
| 04-04 | B | **Personnaliser, puis Skills** : l'annuaire des Skills | `docs/images/guides/04-04_skills_annuaire.png` | ☐ |
| 04-05 | B | Un **artefact** ouvert à côté de la conversation | `docs/images/guides/04-05_artefact.png` | ☐ |
| 04-06 | B | **Personnaliser, puis Connecteurs** : la liste des connecteurs | `docs/images/guides/04-06_connecteurs.png` | ☐ |

---

## 5. Bilan

| Document | Captures | Priorité A |
|---|---|---|
| README | 3 (fournies) | 3 |
| Guide 1 | 20 | 14 |
| Guide 2 | 4 | 3 |
| Guide 3 (MVP) | 0 (les schémas sont déjà fabriqués) | 0 |
| Guide 4 | 6 | 1 |
| **Total** | **33** | **21** |

**Déjà fournies : les 3 captures du README. Il en reste 30, dont 18 de priorité A, à prendre pour la démonstration.**

Le guide 3 (MVP) et la fiche de démonstration ne contiennent **aucune capture à fournir**.
