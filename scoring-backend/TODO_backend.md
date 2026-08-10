# TODO — Backend Scoring — État FINAL Session 5
# Singhe Penka Hendrix Donavan — 21P050 — GI2026
# Date clôture Session 5 : 05 juin 2026

================================================================
## BLOC 1 — CORRECTIONS BACKEND (tout terminé)
================================================================

[x] home_credit_adapter.py     → 27 features NAP exactes (S3)
[x] Section 6b notebook        → is_declarative, is_request_specific (S3)
[x] feature_metadata MongoDB   → 27/27 libellés corrects (S3)
[x] pipeline_service.py        → age_years dynamique + total_shap_abs (S3+4)
[x] scoring.py                 → is_request_specific dans form-schema (S3)
[x] docker-compose.yml         → Volume mount hot-reload (S3)
[x] rho_service.py             → filtrage iv_dict sur 27 NAP uniquement (S4)
[x] shap_service.py            → template structuré v2 (S4)
                                  + suppression warning SHAP ndarray (S5)
[x] admin.py                   → GET /api/admin/thresholds ajouté (S4)
[x] clients.py                 → PATCH + fix OCCUPATION_TYPE mapping (S4+S5)
[x] decisions.py               → BUG-A1 : vérif REVUE_MANUELLE avant override (S5)
[x] monitoring.py              → BUG-C1 : charger_artefacts sans run_id (S5)
[x] pdf_client.py              → datetime serialization fix (S5)
[x] pipeline_service.py        → BUG CRITIQUE WOE : numpy array fix (S5)
                                  → tous les clients avaient score 511 → corrigé
[x] pdo_service.py             → règle thin-file : REFUSE si score < seuil (S5)

================================================================
## BLOC 2 — TESTS ENDPOINTS (21/21 validés ou documentés)
================================================================

--- VALIDÉS (20) ---

[x] POST /api/auth/login                    (S3)
[x] GET  /api/scoring/form-schema           (S3)
[x] POST /api/scoring/predict               (S3+4+5 — WOE fix S5)
[x] POST /api/scoring/simulate              (S3)
[x] GET  /api/scoring/history/{id}          (S3)
[x] GET  /api/clients/search                (S3)
[x] GET  /api/clients/{id}                  (S3)
[x] POST /api/clients                       (S5 — OCCUPATION_TYPE fix)
[x] PATCH /api/clients/{id}                 (S4)
[x] GET  /api/decisions/pending-review      (S3)
[x] POST /api/decisions/{id}/override       (S5 — BUG-A1 fix)
[x] GET  /api/decisions/{id}/pdf            (S5 — datetime fix)
[x] GET  /api/dashboard/statistics          (S3)
[x] GET  /api/dashboard/score-distribution  (S3)
[x] GET  /api/monitoring/model-versions     (S3)
[x] GET  /api/admin/users                   (S3)
[x] GET  /api/admin/thresholds              (S4)
[x] PUT  /api/admin/thresholds              (S5)
[x] POST /api/admin/users                   (S5)
[x] PUT  /api/admin/users/{id}/toggle       (S5)

--- PSI : données insuffisantes (comportement normal) ---

[~] GET  /api/monitoring/model-drift
    → PSI null : N < 10 scorings en démo (attendu — documenté mémoire)

--- DOCUMENTÉ (pas testable sans 2ème modèle) ---

[~] POST /api/monitoring/promote-model
    → Option B : documenté mémoire + visible dans page Gestion des modèles
    → Endpoint 404/400 validés (logique de validation OK)

================================================================
## BLOC 3 — BUGS CORRIGÉS EN SESSION 5
================================================================

[x] BUG-A1 — decisions.py : override sans vérif REVUE_MANUELLE
    → Fix : 4 lignes ajoutées → 400 si décision non-REVUE

[x] BUG-C1 — monitoring.py : TypeError charger_artefacts(app, run_id)
    → Fix : suppression run_id → charger_artefacts(app) seulement

[x] BUG-OCCUPATION — clients.py : type_emploi non mappé → OCCUPATION_TYPE
    → Fix : body.get("type_emploi") or body.get("OCCUPATION_TYPE")

[x] BUG-DATETIME — pdf_client.py : datetime non sérialisable JSON
    → Fix : json.dumps(payload, default=str) au lieu de json=payload

[x] BUG-WOE (CRITIQUE) — pipeline_service.py : IndexError silencieux
    → Cause : transformer.transform(DataFrame)[feature].iloc[0]
               → numpy array ne supporte pas indexation par string
    → Fix : transformer.transform(np.array([valeur]))[0]
    → Impact : tous les clients avaient score 511 avant fix

[x] SHAP-WARNING — shap_service.py : warning cosmétique dans les logs
    → Fix : warnings.filterwarnings() dans calculer_shap()

[x] DÉCISION-THIN-FILE — pdo_service.py : rho_c < 0.25 → REVUE forcée
    → Changement : rho_c < 0.25 + score < seuil_refuse → REFUSE direct

================================================================
## BLOC 4 — GenericAdapter Level 2 (SESSION 6 — Priorité 1)
================================================================

[ ] Tâche 1 — Définir adapter_config_home_credit.yaml
              → 27 features NAP : type direct / formula / aggregation
[ ] Tâche 2 — Implémenter generic_adapter.py
              → Moteur YAML → features (remplace HomeCreditAdapter)
[ ] Tâche 3 — Tester GenericAdapter vs HomeCreditAdapter sur HC-100001
              → Les 27 features doivent être identiques
[ ] Tâche 4 — Documenter dans mémoire
              → Section "Généralisation multi-institutions" Chapitre 3

================================================================
## BLOC 5 — NOUVELLES FONCTIONNALITÉS DASHBOARD (SESSION 6)
================================================================

Décision prise fin Session 5 — Ces 3 endpoints renforcent la valeur
du projet et sont standards dans les systèmes de scoring mondiaux.

[ ] F1 — GET /api/decisions/override-stats
    OBJECTIF : statistiques sur les interventions superviseur
    DONNÉES : collection decisions (override_superviseur = true)
    RETOURNE :
      - total_revue : nombre total de dossiers REVUE_MANUELLE
      - total_overrides : combien ont été tranchés par le superviseur
      - decision_accordes : combien overridés en ACCORDE (%)
      - decision_refuses : combien overridés en REFUSE (%)
      - taux_accord_vs_model : comparaison superviseur vs modèle initial
    VALEUR MÉMOIRE : montre que le modèle est calibré correctement
    COMPLEXITÉ : ~20 lignes MongoDB aggregation, 1 endpoint
    RÔLE : SUPERVISEUR ou ADMIN

[ ] F2 — GET /api/clients/{client_id}/score-progression
    OBJECTIF : suivre l'amélioration d'un client thin-file au fil du temps
    DONNÉES : collection demandes (historique des scorings d'un client)
    RETOURNE :
      - liste chronologique des scorings du client
      - Pour chaque scoring : date, score_pdo, pd_c, rho_c, decision
      - delta_score : évolution entre le premier et le dernier scoring
      - delta_rho : évolution de rho_c (enrichissement du dossier)
    EXEMPLE CONCRET : "ρc : 0.24 → 0.78 | Score : 496 → 583 | REFUSE → ACCORDE"
    VALEUR MÉMOIRE : démontre concrètement le use-case thin-file enrichissement
    COMPLEXITÉ : ~15 lignes MongoDB, 1 endpoint
    RÔLE : AGENT ou SUPERVISEUR

[ ] F3 — GET /api/dashboard/portfolio-risk
    OBJECTIF : vue synthétique du risque du portefeuille scoré
    DONNÉES : collection decisions (tous les scorings du mois)
    RETOURNE :
      - nb_dossiers_scorés : nombre total de scorings
      - pd_moyenne : probabilité de défaut moyenne du portefeuille
      - pd_mediane : médiane (moins sensible aux outliers)
      - distribution_decisions : {ACCORDE: N, REFUSE: N, REVUE: N}
      - taux_thin_file : % de dossiers avec rho_c < 0.40
      - score_moyen : score PDO moyen du portefeuille
    EXEMPLE : "PD moyenne : 8.3% | 15% accordés | 20% refusés | 65% en revue"
    VALEUR MÉMOIRE : indicateur de pilotage niveau direction
    COMPLEXITÉ : ~25 lignes MongoDB aggregation, 1 endpoint
    RÔLE : ADMIN ou SUPERVISEUR

================================================================
## DÉCISIONS ARCHITECTURALES FIGÉES
================================================================

- iv_total = somme IV des 27 NAP uniquement
- Phrases SHAP = libelle + label_seuil + direction + poids%
- gabarits Gemini : conservés MongoDB, ignorés à l'inférence
- Champs immuables PATCH : date_naissance, genre, CODE_GENDER, CODE_GENDER_bin
- Features C : jamais modifiables via PATCH (ETL uniquement)
- age_years : toujours recalculé dynamiquement depuis date_naissance
- WOE : np.array([valeur]) → transformer.transform()[0] (pas DataFrame)
- rho_c < 0.25 + score < seuil_refuse → REFUSE (pas REVUE inutile)
- Promote-model : stabilité 27 features obligatoire entre versions
- Volume mount actif → restart seul (pas rebuild)
- Commande restart : docker compose restart api

================================================================
## DÉCISIONS PÉRIMÈTRE (fin Session 5)
================================================================

- Assurance (scoring sinistre) : HORS SCOPE — périmètre trop large
  pour le délai restant (mi-juillet 2026). À mentionner en perspective
  mémoire uniquement.
- Import documentaire (OCR) : HORS SCOPE — saisie déclarative retenue
  comme approche robuste pour le marché CEMAC. Mentionnable en perspective.
- Nouvelles fonctionnalités validées : F1 override-stats, F2 score-progression,
  F3 portfolio-risk → à implémenter en Session 6 après GenericAdapter.

================================================================
## PROCHAINE SESSION : Session 6
Priorité 0 : Re-scorer HC-100001 (1 commande curl — score 511 bugué)
Priorité 1 : GenericAdapter Level 2 (Bloc 4 — tâches 1→4)
Priorité 2 : Nouvelles fonctionnalités (Bloc 5 — F1, F2, F3)
Priorité 3 : Corrections mémoire (CORRECTIONS_MEMOIRE_SESSION5.md)
================================================================