#!/bin/bash
# ============================================================
# TESTS SESSION 4 — Validation des 4 corrections
# Singhe Penka Hendrix Donavan — 21P050 — GI2026
# ============================================================
# AVANT DE LANCER CE SCRIPT :
#   1. Copier les fichiers corrigés dans app/
#   2. Appliquer le patch pipeline_service.py manuellement
#   3. docker compose restart api
#   4. Attendre 5 secondes que l'API redémarre
#   5. Régénérer le TOKEN (ci-dessous)
# ============================================================

echo "===== GÉNÉRATION DU TOKEN ====="
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "ERREUR : impossible de générer le token. Vérifiez que l'API tourne."
  exit 1
fi
echo "TOKEN généré : ${TOKEN:0:30}..."
echo ""

# ============================================================
# TEST 1 — Bug 3 : GET /api/admin/thresholds
# Attendu : 200 { "accorde": 600.0, "refuse": 500.0 }
# ============================================================
echo "===== TEST 1 — GET /api/admin/thresholds ====="
curl -s -X GET "http://localhost:8080/api/admin/thresholds" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""
echo "ATTENDU : { 'accorde': 600.0, 'refuse': 500.0 }"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 2 — Bug 1 : ρc corrigé (scoring + inspection rho_detail)
# Attendu : sources_manquantes = ["OCCUPATION_TYPE"] uniquement
# ============================================================
echo "===== TEST 2 — Scoring HC-100001 (validation ρc) ====="
SCORING_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/scoring/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "HC-100001",
    "declaratif": {
      "type_contrat": "Cash loans",
      "montant_credit_demande": 250000,
      "montant_annuite": 12000,
      "valeur_bien": 225000
    }
  }')

echo "$SCORING_RESPONSE" | python3 -m json.tool
DEMANDE_ID=$(echo "$SCORING_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['demande_id'])" 2>/dev/null)
echo ""
echo "demande_id capturé : $DEMANDE_ID"
echo ""

echo "--- Inspection rho_detail en MongoDB ---"
docker exec scoring-mongodb mongosh scoring_db --eval '
  db.decisions.aggregate([
    {$match: {"client_id": "HC-100001"}},
    {$sort: {timestamp: -1}},
    {$limit: 1},
    {$project: {_id:0, rho_c:1, "rho_detail.sources_manquantes":1,
                "rho_detail.iv_disponible":1, "rho_detail.iv_total":1}}
  ]).toArray()
' 2>/dev/null
echo ""
echo "ATTENDU :"
echo "  sources_manquantes : ['OCCUPATION_TYPE']  ← 1 seul, pas 37"
echo "  iv_total : < 2.10  ← plus petit que 2.3255 (ancienne valeur gonflée)"
echo "  rho_c    : > 0.87  ← plus proche de 0.90-0.95 (correction vers le haut)"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 3 — Bug 2 : Phrases SHAP corrigées
# Attendu : explication_naturelle cohérente avec label + direction
#           poids_pct présent pour chaque facteur
# ============================================================
echo "===== TEST 3 — Phrases SHAP (validation cohérence) ====="
echo "$SCORING_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
shap = data.get('shap_top5', [])
print(f'Nombre de facteurs SHAP : {len(shap)}')
print()
for i, s in enumerate(shap, 1):
    print(f'  {i}. {s[\"feature\"]}')
    print(f'     valeur_brute = {s.get(\"valeur_brute\")}')
    print(f'     shap_value   = {s.get(\"shap_value\")}')
    print(f'     direction    = {s.get(\"direction\")}')
    print(f'     poids_pct    = {s.get(\"poids_pct\")}%')
    print(f'     phrase : {s.get(\"explication_naturelle\")}')
    print()
"
echo "ATTENDU :"
echo "  - poids_pct non null pour chaque facteur (somme ≈ 100%)"
echo "  - direction=aggravant si shap_value > 0, attenuant si < 0"
echo "  - phrase ne se contredit pas (plus de 'excellent... risque accru')"
echo "  - phrase contient '%' (poids relatif)"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 4a — PATCH /api/clients/{client_id} — cas valide
# ============================================================
echo "===== TEST 4a — PATCH client (cas valide) ====="
curl -s -X PATCH "http://localhost:8080/api/clients/HC-100001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "anciennete_emploi_mois": 3,
    "OCCUPATION_TYPE": "Managers"
  }' | python3 -m json.tool
echo ""
echo "ATTENDU : 200 { message: 'Profil mis à jour', champs_modifies: ['employment_years','OCCUPATION_TYPE'] }"
echo ""

echo "--- Vérification en MongoDB ---"
docker exec scoring-mongodb mongosh scoring_db --eval '
  db.clients.findOne(
    {"client_id": "HC-100001"},
    {"features.employment_years":1, "features.OCCUPATION_TYPE":1,
     "profile.type_emploi":1, "_id":0}
  )
' 2>/dev/null
echo ""
echo "ATTENDU : employment_years = 0.25 (3/12), OCCUPATION_TYPE = 'Managers'"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 4b — PATCH — champ immuable (doit retourner 400)
# ============================================================
echo "===== TEST 4b — PATCH client (champ immuable — doit être refusé) ====="
curl -s -X PATCH "http://localhost:8080/api/clients/HC-100001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date_naissance": "2000-01-01"}' | python3 -m json.tool
echo ""
echo "ATTENDU : HTTP 400 — detail mentionne 'date_naissance' et 'immuable'"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 4c — PATCH — feature C (doit retourner 400)
# ============================================================
echo "===== TEST 4c — PATCH client (feature C — doit être refusé) ====="
curl -s -X PATCH "http://localhost:8080/api/clients/HC-100001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"EXT_SOURCE_2": 0.99}' | python3 -m json.tool
echo ""
echo "ATTENDU : HTTP 400 — detail mentionne 'EXT_SOURCE_2' et 'ETL'"
echo "-------------------------------------------------------"
echo ""

# ============================================================
# TEST 4d — Rescoring après PATCH (vérifier employment_years dans features_brutes)
# ============================================================
echo "===== TEST 4d — Rescoring après PATCH ====="
curl -s -X POST "http://localhost:8080/api/scoring/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "HC-100001",
    "declaratif": {
      "type_contrat": "Cash loans",
      "montant_credit_demande": 250000,
      "montant_annuite": 12000,
      "valeur_bien": 225000
    }
  }' > /dev/null

echo "--- features_brutes après PATCH ---"
docker exec scoring-mongodb mongosh scoring_db --eval '
  db.demandes.aggregate([
    {$match: {"client_id": "HC-100001"}},
    {$sort: {timestamp: -1}},
    {$limit: 1},
    {$project: {_id:0,
      "input.features_brutes.employment_years":1,
      "input.features_brutes.OCCUPATION_TYPE":1}}
  ]).toArray()
' 2>/dev/null
echo ""
echo "ATTENDU : employment_years = 0.25 (et non 6.38 comme avant le PATCH)"
echo "          OCCUPATION_TYPE = 'Managers'"
echo "-------------------------------------------------------"
echo ""

echo "===== TOUS LES TESTS TERMINÉS ====="
echo ""
echo "RÉSUMÉ DES ATTENDUS :"
echo "  TEST 1 (admin GET)      → 200 { accorde:600, refuse:500 }"
echo "  TEST 2 (rho_c)          → sources_manquantes=['OCCUPATION_TYPE'] (1 seul)"
echo "  TEST 3 (SHAP phrases)   → poids_pct non null, phrases cohérentes"
echo "  TEST 4a (PATCH valide)  → 200, employment_years=0.25"
echo "  TEST 4b (immuable)      → 400"
echo "  TEST 4c (feature C)     → 400"
echo "  TEST 4d (rescoring)     → employment_years=0.25 dans features_brutes"