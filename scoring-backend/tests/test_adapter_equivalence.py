"""
test_adapter_equivalence.py — Test d'équivalence GenericAdapter vs HomeCreditAdapter

Vérifie que les 27 features produites par GenericAdapter sont identiques
à celles produites par HomeCreditAdapter pour un échantillon de clients.

Ce test DOIT passer avant tout usage de GenericAdapter ou seed_database_generic.py.

Usage :
    python tests/test_adapter_equivalence.py                  # 50 clients (défaut)
    python tests/test_adapter_equivalence.py --sample 100     # 100 clients
    python tests/test_adapter_equivalence.py --sample 500     # tous les clients seedés
    python tests/test_adapter_equivalence.py --client HC-100001  # client unique

Sortie :
    ✅  SUCCÈS → GenericAdapter validé pour remplacer HomeCreditAdapter
    ❌  ÉCHEC  → divergences affichées, corriger le YAML avant de continuer
"""
import os
import sys
import asyncio
import argparse

import numpy as np

# Permet d'importer les adapters depuis la racine du projet
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from adapters.home_credit_adapter import HomeCreditAdapter
from adapters.generic_adapter import GenericAdapter

# Tolérance pour la comparaison numérique des floats
TOLERANCE = 1e-6


def compare_values(v_hc, v_ga) -> str | None:
    """
    Compare deux valeurs de features.
    Retourne None si équivalentes, message d'erreur sinon.

    Règles :
      - None == None : OK
      - NaN  == NaN  : OK (les deux seront None en MongoDB après _sanitize)
      - NaN  != valeur numérique : ERREUR
      - float : comparaison avec tolérance 1e-6
      - autres : comparaison exacte
    """
    # ── Cas None ──────────────────────────────────────────────────────────
    if v_hc is None and v_ga is None:
        return None
    if v_hc is None or v_ga is None:
        return f"l'un est None → HC={v_hc!r}, GA={v_ga!r}"

    # ── Cas NaN ───────────────────────────────────────────────────────────
    hc_nan = isinstance(v_hc, float) and np.isnan(v_hc)
    ga_nan = isinstance(v_ga, float) and np.isnan(v_ga)
    if hc_nan and ga_nan:
        return None   # Les deux NaN = équivalents (→ None en MongoDB)
    if hc_nan or ga_nan:
        return f"l'un est NaN, l'autre non → HC={v_hc!r}, GA={v_ga!r}"

    # ── Cas numérique ─────────────────────────────────────────────────────
    if isinstance(v_hc, (int, float)) and isinstance(v_ga, (int, float)):
        if abs(float(v_hc) - float(v_ga)) > TOLERANCE:
            return f"divergence numérique → HC={v_hc}, GA={v_ga}"
        return None

    # ── Cas exact (string, bool, int) ─────────────────────────────────────
    if v_hc != v_ga:
        return f"valeurs différentes → HC={v_hc!r}, GA={v_ga!r}"

    return None


async def run_test(sample: int, specific_client: str | None) -> bool:
    """
    Lance le test d'équivalence.
    Retourne True si tous les tests passent, False sinon.
    """
    data_dir = os.getenv("HOME_CREDIT_DATA_DIR", "")
    if not data_dir:
        print("ERREUR: HOME_CREDIT_DATA_DIR non configuré dans .env")
        print("  Ouvre .env et définis : HOME_CREDIT_DATA_DIR=/chemin/vers/csv")
        sys.exit(1)

    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "configs", "adapter_config_home_credit.yaml",
    )
    if not os.path.exists(config_path):
        print(f"ERREUR: Fichier YAML introuvable : {config_path}")
        sys.exit(1)

    print("=" * 65)
    print("  TEST D'ÉQUIVALENCE : GenericAdapter vs HomeCreditAdapter")
    print("=" * 65)

    # ── Initialisation des deux adapters ──────────────────────────────────
    print("\n[1/3] Chargement HomeCreditAdapter...")
    hc = HomeCreditAdapter(data_dir)
    hc.load_data()

    print("\n[2/3] Chargement GenericAdapter...")
    ga = GenericAdapter(config_path, data_dir)
    ga.load_data()

    # ── Sélection de l'échantillon ────────────────────────────────────────
    print("\n[3/3] Comparaison des features...")
    all_ids = await hc.list_all_client_ids()

    if specific_client:
        ids_to_test = [specific_client]
        print(f"  → Client unique : {specific_client}")
    else:
        ids_to_test = all_ids[:sample]
        print(f"  → Échantillon   : {len(ids_to_test)} client(s) sur {len(all_ids)} disponibles")

    print()

    # ── Comparaison feature par feature ──────────────────────────────────
    total_features_checked = 0
    total_errors = 0
    error_log = []

    for client_id in ids_to_test:
        feats_hc = await hc.get_client_features(client_id)
        feats_ga = await ga.get_client_features(client_id)

        # Vérifier que les deux ont le même nombre de features
        if len(feats_hc) != len(feats_ga):
            total_errors += 1
            error_log.append((
                client_id, "_count",
                f"nombre de features différent → HC={len(feats_hc)}, GA={len(feats_ga)}"
            ))
            continue

        for feat_name, v_hc in feats_hc.items():
            total_features_checked += 1
            v_ga = feats_ga.get(feat_name)
            msg = compare_values(v_hc, v_ga)
            if msg:
                total_errors += 1
                error_log.append((client_id, feat_name, msg))

    # ── Résultats ─────────────────────────────────────────────────────────
    print(f"  Features vérifiées : {total_features_checked:,}")
    print(f"  Clients testés     : {len(ids_to_test)}")
    print(f"  Erreurs détectées  : {total_errors}")

    if total_errors == 0:
        print()
        print("  ✅  SUCCÈS — GenericAdapter produit des valeurs identiques")
        print("      à HomeCreditAdapter sur les 27 features NAP.")
        print()
        print("  → GenericAdapter est validé.")
        print("  → Tu peux utiliser seed_database_generic.py en toute sécurité.")
        print()
        return True
    else:
        print()
        print(f"  ❌  ÉCHEC — {total_errors} divergence(s) détectée(s)")
        print()
        print("  Premières erreurs :")
        for client_id, feat, msg in error_log[:10]:
            print(f"    [{client_id}] {feat:30s} : {msg}")
        if len(error_log) > 10:
            print(f"    ... et {len(error_log) - 10} erreur(s) supplémentaire(s)")
        print()
        print("  → Corriger adapter_config_home_credit.yaml et relancer ce test.")
        print()
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test d'équivalence GenericAdapter vs HomeCreditAdapter"
    )
    parser.add_argument(
        "--sample", type=int, default=50,
        help="Nombre de clients à tester (défaut: 50)",
    )
    parser.add_argument(
        "--client", type=str, default=None,
        help="Tester un client spécifique (ex: HC-100001)",
    )
    args = parser.parse_args()

    success = asyncio.run(run_test(args.sample, args.client))
    sys.exit(0 if success else 1)