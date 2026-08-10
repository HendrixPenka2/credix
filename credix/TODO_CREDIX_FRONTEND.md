# ✅ TODO — CREDIX Frontend — Connexion complète au Backend
> **Projet :** Application IA de Scoring de Risque de Crédit (Explainable AI)  
> **Étudiant :** Singhe Penka Hendrix Donavan — 21P05A — ENSPY GI2026  
> **Stack Frontend :** Next.js 15 · React 19 · Tailwind 4 · Recharts · Lucide  
> **Backend :** FastAPI sur `http://localhost:8080` — **31 endpoints validés**  
> **Règle :** On coche ensemble après validation et test de chaque tâche.

---

## 🔖 Légende des priorités
- 🔴 **BLOQUANT** — sans ça rien ne marche
- 🟠 **CRITIQUE** — fonctionnalité principale PFE
- 🟡 **IMPORTANT** — valeur ajoutée forte pour la soutenance
- 🟢 **POLISH** — UX waouh, finition

---

## 🎨 CHARTE DESIGN — RÈGLE ABSOLUE (à respecter sur TOUTES les pages)

> **Objectif : design WAOUH niveau production bancaire.**  
> Chaque page construite doit respecter ces conventions.

- **Style général :** Tableau dense (comme Linear/Notion) — max d'info visible, pro
- **Filtres :** Chips/badges inline au-dessus des résultats (pas de sidebar supplémentaire)
- **Couleurs décisions :**
  - `ACCORDE` → vert (`emerald`)
  - `REFUSE` → rouge (`rose`)
  - `REVUE_MANUELLE` → orange (`amber`)
- **Couleurs ρc :**
  - `rho < 0.25` → rouge (`rose`) — critique
  - `0.25 ≤ rho < 0.40` → orange (`amber`) — attention
  - `rho ≥ 0.40` → vert (`emerald`) — ok
- **Composants réutilisables obligatoires :** `DecisionBadge`, `PsiBadge`, `ModelStatusBadge`, `ScoreGauge`, `CoverageRing`, `ShapBar` (tous existent déjà dans `components/`)
- **Skeleton loading** sur TOUTES les pages pendant le fetch
- **EmptyState** quand la liste est vide
- **Toast** après chaque action (succès vert, erreur rouge)
- **Dark mode** : utiliser les classes `dark:` Tailwind systématiquement

---

## PHASE 1 — Fondations ✅ COMPLÈTE 🔴

### 1.1 — Environnement & Configuration ✅
- [x] Créer `.env.local` avec `NEXT_PUBLIC_API_URL=http://localhost:8080`
- [x] Vérifier que le port backend est bien 8080 (exposé dans `docker-compose.yml`)

### 1.2 — Types TypeScript (`lib/types/`) ✅
> ⚠️ **DIFF Session Backend Final 26/06 :** `ScoringResult` a 5 nouveaux champs IF à ajouter dans `lib/types/scoring.ts`

- [x] Type `AuthResponse` — `{ token, role, user_id, nom, prenom, expires_at }`
- [x] Type `Role` — `'AGENT' | 'SUPERVISEUR' | 'ADMIN'`
- [x] Type `ClientProfile`
- [x] Type `Coverage` — `{ rho, sources_disponibles, sources_manquantes, has_history }`
- [x] Type `Client`
- [x] Type `ClientSearchResult`
- [x] Type `LastScore` — `{ score_pdo, decision, pd_c, date }`
- [x] Type `ShapItem`
- [x] Type `RecommandationRho`
- [x] Type `PercentileData`
- [x] **Type `ScoringResult`** — ⚠️ **AJOUTER les 5 champs IF manquants** :
  ```typescript
  // Champs existants...
  // + NOUVEAUX champs Isolation Forest (session backend 26/06)
  decision_initiale: string | null   // Ce que LightGBM avait dit AVANT l'IF
  anomaly_score: number | null       // Score IF (plus haut = plus anormal)
  is_anomaly: boolean                // true si profil détecté anormal
  if_escalade: boolean               // true si ACCORDE → REVUE_MANUELLE forcé
  if_seuil: number | null            // Seuil P95 utilisé
  ```
- [x] Type `SimulationResult`
- [x] Type `FormChamp`, `FormSchema`
- [x] Type `Decision`, `DecisionPendingReview`, `OverrideStats`, `ScoreProgression`
- [x] Types Dashboard, Monitoring, Admin

### 1.3 — Client HTTP (`lib/api-client.ts`) ✅
- [x] Instance axios avec `baseURL`
- [x] Intercepteur requête → JWT automatique
- [x] Intercepteurs réponse 401/403/404/500

### 1.4 — Repositories (`lib/repositories/`) ✅ (sauf 1 manquant)
- [x] `auth.repository.ts` — login, logout
- [x] `clients.repository.ts` — search, getById, create, update, getScoreProgression
- [x] `scoring.repository.ts` — getFormSchema, predict, simulate, getScoringHistory
- [x] `decisions.repository.ts` — getPendingReviews, overrideDecision, downloadPdf, getOverrideStats
- [x] `dashboard.repository.ts` — statistics, score-distribution, percentile, portfolio-risk, score-bands
- [x] `monitoring.repository.ts` — model-drift, feature-drift, model-versions, promote-model, audit-logs
- [x] `admin.repository.ts` — getUsers, createUser, toggleUser, getThresholds, updateThresholds
  - [x] `uploadModel(formData: FormData)` → `POST /api/admin/upload-model` (multipart **14 fichiers** — refonte BK.1 + Flux B hybride, cf. 4.1)

### 1.5 — Auth Context ✅
- [x] `AuthContext` avec user, token, role, login(), logout()
- [x] Stockage localStorage
- [x] Redirection selon rôle après login
- [x] Hook `useAuth()`

### 1.6 — Page Login ✅
- [x] Formulaire username + password connecté
- [x] Erreurs backend affichées
- [x] Loading state

### 1.7 — ClientLayout sécurisé ✅
- [x] Vérification token
- [x] Nom/prénom réel dans Sidebar
- [x] Logout via `useAuth().logout()`

### 1.8 — Hook `useApi` générique ✅
- [x] Hook `useApi<T>(fn, immediate?)` → `{ data, loading, error, refetch }`
- [x] Fichier : `hooks/useApi.ts` — **EXISTE et fonctionne**

### 1.9 — Dark/Light Mode System 🔴 BLOQUANT — À FAIRE EN PREMIER
> **Règle absolue :** Zéro couleur hardcodée dans toute l'application.  
> Toujours `bg-white dark:bg-slate-900` — jamais `bg-white` seul.  
> Le thème doit être synchronisé depuis la page login jusqu'à toutes les pages internes.

**Technique : `next-themes` (standard Next.js App Router)**

- [x] Vérifier/installer `next-themes` : `npm install next-themes`
- [x] Vérifier `tailwind.config.ts` : `darkMode: 'class'` (probablement déjà en place)
- [x] Créer composant `components/ThemeProvider.tsx` — wrapper `next-themes`
- [x] Modifier `app/layout.tsx` — envelopper avec `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
- [x] Créer composant `components/ThemeToggle.tsx` — bouton soleil/lune (icône Lucide `Sun` / `Moon`)
  - Utilise `useTheme()` de `next-themes`
  - Un seul composant réutilisé partout
- [x] Intégrer `ThemeToggle` dans la **page Login** (coin supérieur droit)
- [x] Intégrer `ThemeToggle` dans la **Topbar** (composant `LayoutParts.tsx`)
- [x] Supprimer `forcedTheme="light"` si présent dans le layout actuel
- [x] Auditer la page Login — remplacer toutes les couleurs hardcodées par `dark:` variants
- [x] Auditer `ClientLayout` / `Sidebar` / `Topbar` — idem
- [x] **Valider :** toggle sur login → l'app entière change de thème
- [x] **Valider :** le choix persiste après refresh (localStorage `next-themes`)
- [x] **Valider :** préférence système reconnue au premier chargement (si `enableSystem`)

---

## PHASE 2 — Pages AGENT 🟠

### 2.1 — Recherche Clients (`/clients`) ♻️ REFAIRE (connectée mais design à revoir)
> La page est fonctionnellement connectée au backend mais le design doit être entièrement refait.  
> **Style :** Tableau dense + chips de filtres inline. Voir charte design.

- [x] Connecter la recherche texte → `GET /api/clients/search?q=`
- [x] Filtre `rho_max` → clients thin-file
- [x] Filtre `decision_derniere` (ACCORDE / REFUSE / REVUE_MANUELLE)
- [x] Résultats réels depuis l'API
- [x] Badge ρc coloré selon valeur (rouge / orange / vert)
- [x] Badge décision coloré
- [x] Bouton "Nouveau client" → `/clients/nouveau`
- [x] Loading skeleton
- [x] État vide
- [x] **♻️ REFAIRE le design complet** — tableau propre, chips intuitifs, hiérarchie visuelle claire

### 2.2 — Profil Client (`/clients/[id]`) 🚧 À FAIRE
> Actuellement placeholder vide ("Phase 2.2")

#### Cas CLIENT EXISTANT (`is_new_client = false`)
- [x] Appeler `GET /api/clients/{id}` — afficher données réelles
- [x] Section profil : nom, prénom, date naissance, genre, emploi, revenu, éducation, enfants
- [x] Section coverage : `CoverageRing` avec ρc réel + sources disponibles/manquantes
- [x] Si `coverage.rho < 0.25` → badge "REVUE FORCÉE" rouge
- [x] Si `coverage.rho < 0.40` → bannière orange "Couverture partielle"
- [x] Onglet **Décision & Score** : `last_score`, `ScoreGauge`, `DecisionBadge`, PD, date
- [x] Onglet **Explicabilité (XAI)** : `ShapBar` × 5 depuis `last_score.shap_top5`
- [x] Onglet **Historique** : tableau depuis `GET /api/scoring/history/{id}`
- [x] Onglet **Progression** : `LineChart` depuis `GET /api/clients/{id}/score-progression`
- [x] Bouton "Lancer un scoring" → `/score?client_id=`
- [x] Bouton "Simuler (What-If)" → `/simul?client_id=`
- [x] Bouton "Modifier le profil" → modal PATCH

#### Cas NOUVEAU CLIENT (`is_new_client = true`)
- [x] Bannière bleue "Nouveau client — aucun historique"
- [x] Bannière rouge critique si ρc très bas + liste documents recommandés
- [x] Bouton scoring très visible

### 2.3a — Création Nouveau Client (`/clients/nouveau`) 🚧 À FAIRE
- [x] Formulaire profil : nom, prénom, date naissance, genre, situation familiale, nb enfants, type emploi, type revenu, niveau éducation, téléphone, agence
- [x] Champs B déclaratifs : ancienneté emploi (mois), ancienneté domicile (mois)
- [x] Validation côté client (champs obligatoires)
- [x] Appel `POST /api/clients`
- [x] Redirect vers `/clients/{client_id}` après création
- [x] Afficher `client_id` généré
- [x] Loading state + gestion erreur 409 (client déjà existant)

### 2.3b — Modification Profil (modal sur `/clients/[id]`) 🚧 À FAIRE
> Seuls les champs B modifiables (features C et champs immuables grisés)

- [x] Champs autorisés uniquement : `anciennete_emploi_mois`, `anciennete_domicile_mois`, `OCCUPATION_TYPE`, `ORGANIZATION_TYPE`, `NAME_INCOME_TYPE`, `NAME_EDUCATION_TYPE`
- [x] Champs immuables grisés : `date_naissance`, `genre`, `client_id`
- [x] Appel `PATCH /api/clients/{id}`
- [x] Toast "Profil mis à jour" + refetch

### 2.4 — Nouveau Scoring (`/score`) 🚧 À FAIRE ⭐ PAGE CENTRALE PFE
> C'est la page la plus importante — le jury doit voir la magie opérer ici.

**Étape 1 — Sélection client**
- [x] Autocomplete sur `GET /api/clients/search`
- [x] Afficher ρc du client sélectionné + bannière thin-file si nécessaire

**Étape 2 — Formulaire data-driven**
- [x] Appeler `GET /api/scoring/form-schema` au chargement
- [x] Construire le formulaire dynamiquement depuis `champs[]`
- [x] Client EXISTANT (`is_new_client = false`) → champs `is_request_specific = true` uniquement
- [x] Nouveau CLIENT (`is_new_client = true`) → TOUS les champs (A + B)
- [x] Types de champs : `number`, `select`, `date`, `boolean`
- [x] Validation obligatoires avant soumission

**Étape 3 — Résultat scoring**
- [x] Appel `POST /api/scoring/predict`
- [x] `ScoreGauge` animée avec `score_pdo`
- [x] `DecisionBadge` coloré (ACCORDÉ / REFUSÉ / REVUE MANUELLE)
- [x] `pd_c` en %
- [x] `CoverageRing` avec `rho_c`
- [x] `ShapBar` × 5 avec `explication_naturelle`
- [x] Bannière `recommandation_rho` si `afficher = true` (thin-file)
- [x] Percentile : "Ce client est supérieur à X% des dossiers"
- [x] ⚠️ **NOUVEAU IF — si `if_escalade = true`** → badge rouge "Profil atypique détecté" + phrase "Le modèle LightGBM avait recommandé ACCORDÉ — l'analyse de détection d'anomalie a forcé une REVUE MANUELLE"
- [x] ⚠️ **NOUVEAU IF — si `anomaly_score != null`** → jauge IF (score brut + seuil `if_seuil`)
- [x] Bouton "Télécharger rapport PDF" → `GET /api/decisions/{demande_id}/pdf` (Blob)
- [x] Bouton "Simuler un scénario différent" → `/simul?client_id=&demande_id=`
- [x] Loading state (1-2s)

### 2.5 — Simulateur What-If (`/simul`) 🚧 À FAIRE
- [x] Pré-remplir depuis `?client_id=` dans l'URL
- [x] En-tête "MODE SIMULATION" bien visible
- [x] Appel `POST /api/scoring/simulate`
- [x] Comparaison côte à côte : score simulé vs dernier score réel
- [x] Badge "SIMULATION — non enregistré"
- [x] `ShapBar` × 3 (`shap_top3`)
- [x] Bouton "Lancer le vrai scoring" → `/score?client_id=`

### 2.6 — Historique (`/hist`) 🚧 À FAIRE
- [x] Sélecteur client (autocomplete)
- [x] Tableau depuis `GET /api/scoring/history/{client_id}`
- [x] `LineChart` Recharts — évolution score dans le temps
- [x] `LineChart` Recharts — évolution ρc
- [x] Badge décision par ligne
- [x] Bouton PDF par ligne → `GET /api/decisions/{id}/pdf` (Blob)

### 2.7 — Mes Rapports PDF (`/rep`) 🚧 À FAIRE
- [x] Liste décisions de l'agent connecté
- [x] Filtre période (7j / 30j)
- [x] Bouton téléchargement PDF (Blob — pas navigation URL)

### 2.8 — Dashboard AGENT (`/dashboard`) 🚧 À FAIRE
- [x] `GET /api/dashboard/statistics?periode=7j`
- [x] 4 cartes : dossiers scorés, accords, revues, refus
- [x] `BarChart` Recharts — volume scorings depuis `score-distribution`
- [x] Sélecteur période (7j / 30j / 90j)

---

## PHASE 3 — Pages SUPERVISEUR 🟠

### 3.1 — Dossiers en Revue (`/superviseur/revue`) 🚧 À FAIRE
- [x] `GET /api/decisions/pending-review`
- [x] Tableau : client, score PDO, ρc, date, SHAP top 3
- [x] Badge compteur dans Sidebar (nombre réel)
- [x] Panel détail au clic : profil + score + SHAP + recommandation rho
- [x] Formulaire override : ACCORDÉ / REFUSÉ + commentaire (min 20 caractères)
- [x] Appel `POST /api/decisions/{id}/override`
- [x] Retrait dossier de la liste après validation + toast
- [x] Gestion erreurs 409 (déjà traité) + 400 (pas en REVUE_MANUELLE)

### 3.2 — Mes Validations (`/superviseur/mes-validations`) 🚧 À FAIRE
- [x] `GET /api/decisions/override-stats`
- [x] Taux override, taux accord, interprétation calibration
- [x] Donut chart accords/refus (Recharts)

### 3.3 — Vue Portefeuille (`/superviseur`) 🚧 À FAIRE
- [x] `GET /api/dashboard/portfolio-risk?periode=30j`
- [x] 4 cartes : dossiers scorés, PD moyenne, taux thin-file, en attente revue
- [x] Alerte si `alerte != null` (bannière rouge/orange)
- [x] `BarChart` stacké : accords/revues/refus
- [x] Sélecteur période

### 3.4 — Distribution Scores (`/superviseur/distribution`) 🚧 À FAIRE
- [x] `GET /api/dashboard/score-distribution?periode=`
- [x] Histogramme tranches 50 pts (`BarChart` Recharts)
- [x] Lignes verticales aux seuils PDO (600 / 500 par défaut)
- [x] Sélecteur période

### 3.5 — Tranches de Risque (`/superviseur/tranches`) 🚧 À FAIRE
- [x] `GET /api/dashboard/score-bands?periode=`
- [x] Tableau 6 tranches : libellé, count, % portefeuille, PD moy, score moy, ρc moy, accords/refus/revues
- [x] Code couleur par tranche (rouge → vert)
- [x] Alerte visuelle si PD non monotone décroissante (fineness test)

### 3.6 — Dérive Globale PSI (`/superviseur/modele/derive`) 🚧 À FAIRE
- [x] `GET /api/monitoring/model-drift`
- [x] Jauge PSI colorée (vert < 0.10 / orange < 0.25 / rouge ≥ 0.25)
- [x] `PsiBadge` statut (STABLE / ATTENTION / DÉRIVE / INSUFFISANT)
- [x] Message interprétation + nb_scores_reference / nb_scores_actuels

### 3.7 — Dérive par Variable (`/superviseur/modele/variables`) 🚧 À FAIRE
- [x] `GET /api/monitoring/feature-drift`
- [x] Tableau 27 features triées par PSI décroissant
- [x] `PsiBadge` + barre progression PSI par feature
- [x] Résumé : statut_global, nb_dérives, nb_attention, nb_stables

### 3.8 — Versions Modèle (`/superviseur/modele/versions`) 🚧 À FAIRE
- [x] `GET /api/monitoring/model-versions`
- [x] Tableau : version, `ModelStatusBadge`, AUC, Recall, date, promoted_at
- [x] Vue lecture seule (pas de bouton promouvoir)

---

## PHASE 4 — Pages ADMIN 🟡 ✅ COMPLÈTE

### 4.1 — Vue Générale Admin (`/admin`) ✅
- [x] `GET /api/monitoring/model-versions` pour tableau
- [x] `GET /api/admin/users` pour compteur actifs
- [x] 4 cartes stats (`AdminStatCards` → `StatCard`)
- [x] Tableau versions avec bouton "Promouvoir" pour les STAGING
- [x] `POST /api/monitoring/promote-model` + modale confirmation (`PromoteConfirmModal` sur `ConfirmDialog` générique)
- [x] Bouton "Uploader un modèle" → formulaire multipart **14 fichiers** → `POST /api/admin/upload-model`
  - ⚠️ **Corrigé cette session** : le formulaire n'avait que 9/11 champs et le nom `encoder_if` (obsolète). Aligné sur les 14 artefacts réels de `_ARTEFACTS` (backend `app/main.py`) :
    `woe_transformers`, `nap_features`, `lgbm_model`, `iv_scores`, `feature_stats` (Flux A) ·
    `isotonic_calibrator`, `decision_config` (BK.1 calibration/décision) ·
    `autoencoder`, `ae_metadata`, `isolation_forest`, `if_metadata`, `scaler_if`, `encoder_hybrid`, `colonnes_ordonnees_61` (Flux B hybride 61 dims)
  - [x] Compteur "Uploader (N/14)" dynamique (`ALL_KEYS.length`, plus de "11" en dur)
  - [x] Afficher le `run_id` retourné après upload
  - [x] Gestion erreur backend (détail affiché dans le formulaire)

### 4.2 — Liste des Comptes (`/admin/utilisateurs`) ✅
- [x] `GET /api/admin/users`
- [x] Tableau : username, nom complet, rôle, statut, agence, dernière connexion
- [x] `RoleBadge` (AGENT bleu / SUPERVISEUR violet / ADMIN rouge, via `lib/design-tokens.ts`)
- [x] Toggle actif/inactif → `PUT /api/admin/users/{id}/toggle` + confirmation (`ToggleUserModal` sur `ConfirmDialog`)
- [x] Bouton "Nouveau compte" → `/admin/utilisateurs/nouveau`

### 4.3 — Nouveau Compte (`/admin/utilisateurs/nouveau`) ✅
- [x] Formulaire : username, password, confirmation, rôle, nom, prénom, email, agence
- [x] Validation : password ≥ 8 car., username ≥ 3 car.
- [x] `POST /api/admin/users`
- [x] Erreur 409 (username pris)
- [x] Redirect + confirmation après succès

### 4.4 — Configuration Seuils (`/admin/configuration`) ✅
- [x] `GET /api/admin/thresholds` → pré-remplir formulaire
- [x] Seuil ACCORDÉ (≥ 300, ≤ 850) + seuil REFUSÉ (≥ 300, ≤ 850)
- [x] Validation : REFUSÉ < ACCORDÉ
- [x] Visualisation règle de décision avec les seuils actuels (`ThresholdVisualizer`)
- [x] `PUT /api/admin/thresholds`
- [x] Section lecture seule : seuils ρc (non modifiables via API)

### 4.5 — Versions Modèle Admin (`/admin/modeles`) ✅
- [x] Identique à 3.8 MAIS avec bouton "Promouvoir"
- [x] Modale confirmation avant promotion
- [x] `POST /api/monitoring/promote-model`
- [x] Gestion 400/404 (détail backend affiché)

### 4.6 — Dérive Globale PSI Admin (`/admin/modeles/derive`) ✅
- [x] Factorisé avec 3.6 dans `components/monitoring/DeriveGlobaleView.tsx` (un seul composant, `variablesHref` paramétré par rôle) — élimine la duplication signalée

### 4.7 — Dérive par Variable Admin (`/admin/modeles/variables`) ✅
- [x] Factorisé avec 3.7 dans `components/monitoring/VariablesDriveView.tsx` (composant partagé, zéro duplication)

### 4.8 — Journal d'Audit (`/admin/audit`) ✅
- [x] `GET /api/monitoring/audit-logs?limite=50`
- [x] Tableau : timestamp, user_id, rôle, action, ressource, ressource_id, statut
- [x] Filtre action (`Select` Radix depuis `actions_disponibles`)
- [x] Filtre user_id (input texte)
- [x] `OutcomeBadge` SUCCES vert / ECHEC rouge
- [x] "Charger plus" (pagination incrémentale)

---

## PHASE 5 — Composants transversaux 🟡 ✅ COMPLÈTE

### 5.1 — Toast/Notification System ✅
- [x] `components/ui/toast.tsx` — Radix Toast, variantes succès/erreur/warning/info
- [x] Hook `useToast()` accessible partout (monté une fois dans `Providers.tsx`)
- [x] Auto-dismiss 4 secondes
- [x] Adopté partout où il y avait un `alert()` natif ou une bannière d'erreur ad hoc (formulaires, PDF, overrides, config seuils…)

### 5.2 — Loading Skeletons ✅
- [x] `components/ui/skeleton.tsx` — primitive réutilisée sur les pages avec fetch (listes, profil client, graphiques)

### 5.3 — `EmptyState` ✅
- [x] `components/ui/empty-state.tsx` — icône + message + bouton action optionnel, utilisé sur toutes les listes/tableaux vides (hist, rep, revue, comptes, versions, audit…)

### 5.4 — `ErrorState` ✅
- [x] `components/ui/error-state.tsx` — message erreur API + bouton "Réessayer", utilisé sur toutes les pages avec chargement réseau

### 5.5 — `ConfirmModal` ✅
- [x] `components/ui/confirm-dialog.tsx` — `ConfirmDialog` générique (Radix Dialog), remplace les anciennes modales dupliquées `PromoteConfirmModal`/`ToggleUserModal` (maintenant de fins wrappers dessus)

### 5.6 — `RhoBanner` ✅
- [x] Bannière thin-file intégrée dans `ScoringResultDisplay`/`SimulResultDisplay`/`RevueDetail` : niveau_urgence, message, ρc potentiel

### 5.7 — `ScoringResultCard` ✅
- [x] `ScoringResultDisplay` (résultat réel) + `SimulResultDisplay` (simulation) — ScoreGauge, DecisionBadge, CoverageRing, ShapBars, bloc analyse d'anomalie (IF/AE)

---

## PHASE 6 — Polish UX 🟢

### 6.1 — Animations ♻️ PARTIEL
- [x] Transitions CSS sur jauges/barres (`transition-all duration-500` sur `ScoreGauge`, `CoverageRing`, `ShapBar`)
- [ ] Compte animé 300 → score réel sur `ScoreGauge` (non fait — pur count-up JS, cosmétique, pas bloquant)

### 6.2 — Responsive 🚧 NON ADRESSÉ CETTE SESSION
> Le focus de cette session était le relookage desktop complet (toutes les pages). Le responsive tablette/mobile n'a pas été traité et reste à faire si la soutenance doit supporter ces tailles d'écran.
- [ ] Sidebar collapsible tablette
- [ ] Tableaux scrollables mobile
- [ ] Formulaires adaptés mobile

### 6.3 — Dark Mode ✅
- [x] Pas de `forcedTheme` — thème piloté par `next-themes` (`ThemeToggle`)
- [x] Tous les composants relookés cette session suivent la charte `dark:` systématique (`getRhoStyle`/`getDecisionStyle`/etc. dans `lib/design-tokens.ts`)
- [x] Persistance via `next-themes` (localStorage)

### 6.4 — Recherche globale (Topbar) ✅
- [x] `GET /api/clients/search` avec debounce 300ms (`components/GlobalSearch.tsx` + `hooks/useDebouncedValue.ts`)
- [x] Dropdown résultats inline
- [x] Clic → redirect profil client

### 6.5 — Badge temps réel Sidebar ✅
- [x] Compteur dossiers en revue — polling 30s (`hooks/usePendingReviewCount.ts`), affiché dans `LayoutParts.tsx` pour SUPERVISEUR/ADMIN

---

## PHASE 7 — Nettoyage et préparation soutenance 🟢

- [x] `lib/data.ts` / imports `mockClients` — déjà absents du repo (rien à supprimer)
- [x] `ErrorState` + `onRetry` posé sur toutes les pages avec fetch réseau → états erreur propres si le backend est down (structurel ; pas re-testé manuellement backend éteint cette session)
- [ ] `NEXT_PUBLIC_API_URL` documenté dans README
- [ ] Flow AGENT : login → créer client → scorer → PDF (à re-tester visuellement après le relookage)
- [ ] Flow SUPERVISEUR : login → revue → override → stats (à re-tester visuellement après le relookage)
- [ ] Flow ADMIN : login → créer user → seuils → audit → uploader modèle 14 fichiers (à re-tester visuellement après le relookage)
- [ ] Screenshots pour slides soutenance (Ch.3 mémoire)

---

## 📌 Règles métier à ne JAMAIS oublier

> **Formulaire data-driven**
> - Client existant (`is_new_client = false`) → champs `is_request_specific = true` UNIQUEMENT
> - Nouveau client (`is_new_client = true`) → TOUS les champs (A + B)

> **Thin-file**
> - `rho_c < 0.25` → décision forcée REVUE ou REFUSÉ selon score
> - Toujours afficher `recommandation_rho` si `afficher = true`

> **Isolation Forest (NOUVEAU — session backend 26/06)**
> - `if_escalade = true` → badge "Profil atypique détecté" + montrer `decision_initiale`
> - `anomaly_score != null` → afficher jauge IF (score + seuil)
> - Règle escalade : ACCORDE + anomalie → REVUE_MANUELLE (REFUSE reste REFUSE)

> **PATCH profil**
> - Champs B uniquement. Champs immuables (date_naissance, genre, client_id) → grisés

> **PDF = Blob**
> - `response.blob()` → téléchargement local — jamais de navigation vers URL

> **Port backend = 8080**

---

## 🗓️ Ordre de travail recommandé (soutenance avant mi-juillet)

| Priorité | Tâche | Impact soutenance |
|---|---|---|
| 0 | **1.9 Dark/Light Mode System** | Bloquant — base de tout le design |
| 1 | Fix type `ScoringResult` + `uploadModel` repo | Technique — bloquant |
| 2 | Refaire `/clients` (design WAOUH) | Premier écran vu par le jury |
| 3 | `/clients/[id]` complet avec 4 onglets | Démo profil client |
| 4 | `/score` complet avec IF | Page centrale PFE |
| 5 | `/superviseur/revue` + override | Flow superviseur |
| 6 | `/dashboard` agent + `/superviseur` portefeuille | Stats & vision globale |
| 7 | `/clients/nouveau` + `/simul` | Complétion flow agent |
| 8 | Pages admin | Gouvernance |
| 9 | Composants transversaux (Toast, Skeleton…) | UX propre |
| 10 | Screenshots + nettoyage | Mémoire Ch.3 |

---

## 🎨 Session Frontend 2 — Relookage complet (2026-08-06)

> Suite au constat "design trop cloche IA", passage complet de toutes les pages existantes sur la charte design unifiée (`components/ui/*`, `lib/design-tokens.ts`) : Card/Button/Badge/Table/Input/Select/Dialog/Toast/EmptyState/ErrorState/StatCard/Avatar, radius policy (`rounded-lg` contrôles / `rounded-xl` cartes / `rounded-full` pills), couleurs sémantiques centralisées, zéro emoji dans le JSX, zéro `alert()` natif.

- [x] Phase 2 (Agent) — `/clients`, `/clients/[id]`, `/clients/nouveau`, `/score`, `/simul`, `/hist`, `/rep`, `/dashboard` — relookés + `ThinFileWatch` (orphelin) branché sur le dashboard
- [x] Phase 3 (Superviseur) — les 8 pages + les ~15 composants `superviseur/*` relookés (revue/override, mes-validations, portefeuille, distribution, tranches, dérive globale, dérive par variable, versions)
- [x] Phase 4 (Admin) — les 8 pages + les 8 composants `admin/*` relookés, `UploadModelModal` corrigé (9→14 fichiers, `encoder_if`→`encoder_hybrid`, + `isotonic_calibrator`/`decision_config`/`colonnes_ordonnees_61`), pages dérive/variables factorisées avec le superviseur (`components/monitoring/`)
- [x] Bugs fonctionnels corrigés au passage : `ModelHealth` lisait `drift.statut_global`/`drift.psi_global` (inexistants — vrais champs `statut`/`psi`), `Recall` affiché alors qu'absent des métriques réelles (remplacé par `Gini`), lien nav mort `/clients-rep`, recherche globale et cloche non fonctionnelles
- [x] Composant `Badges.tsx` (ancien ré-export de compatibilité) supprimé — plus aucun consommateur, tout passe par `components/ui/badge.tsx`
- [ ] Test visuel réel dans le navigateur (build + serveur dev) — dernière étape restante

*Dernière mise à jour : Session Frontend 2 — 6 août 2026*  
*Backend : 31/31 endpoints validés ✅ — Frontend : relookage complet Phases 1-5, Phase 6/7 partielles (responsive + tests visuels restants)*