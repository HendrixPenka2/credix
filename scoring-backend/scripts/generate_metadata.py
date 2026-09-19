"""
generate_metadata.py -- Genere feature_metadata dans MongoDB via LLM Gemini/Anthropic.
Lance ce script apres l'entrainement, avant de promouvoir le modele.
Necessite: feature_stats.json dans ARTEFACTS_DIR et une cle API LLM.

Usage:
    python scripts/generate_metadata.py
    python scripts/generate_metadata.py --run-id lgbm-run-v1 --dry-run
"""
import os, sys, json, asyncio, argparse, re
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

FALLBACK_TEMPLATE = {
    "libelle_agent": "{feature}",
    "seuils": [],
    "gabarit_aggravant": "La variable {libelle} contribue a augmenter le risque (contribution: {shap_value:+.3f}).",
    "gabarit_attenuant": "La variable {libelle} contribue a reduire le risque (contribution: {shap_value:+.3f}).",
    "gabarit_fallback": "La variable {libelle} contribue a {direction} le risque (contribution: {shap_value:+.3f}).",
    "document_recommande": "Document justificatif",
}


def build_prompt(feature, stats):
    if stats.get("type") == "categorical":
        modalites_str = "\n".join([f"  - {m}: taux defaut = {r:.1%}" for m, r in stats.get("defaut_par_modalite", {}).items()])
        return f"""Tu es expert en scoring de credit bancaire pour les marches africains.
Variable categorielle: {feature}
Famille: {stats.get('famille', 'inconnue')}
Modalites et taux de defaut:
{modalites_str}
Taux NaN: {stats.get('nan_rate', 0):.1%}

Reponds UNIQUEMENT en JSON valide (sans backticks):
{{"libelle_agent":"...", "seuils":[], "gabarit_aggravant":"phrase avec {{libelle}} et {{valeur}}", "gabarit_attenuant":"phrase avec {{libelle}} et {{valeur}}", "gabarit_fallback":"phrase avec {{libelle}} {{direction}} {{shap_value:+.3f}}", "document_recommande":"..."}}"""
    else:
        direction = "Plus la valeur est elevee, plus le risque augmente." if stats.get("direction") == "positive" else "Plus la valeur est elevee, plus le risque diminue."
        return f"""Tu es expert en scoring de credit bancaire pour les marches africains.
Variable numerique: {feature}
Famille: {stats.get('famille', 'inconnue')}
Information Value: {stats.get('iv', 0):.4f}
Direction: {direction}
Statistiques: p25={stats.get('p25', 0):.4f} p50={stats.get('p50', 0):.4f} p75={stats.get('p75', 0):.4f} p95={stats.get('p95', 0):.4f}
Taux NaN: {stats.get('nan_rate', 0):.1%}

Reponds UNIQUEMENT en JSON valide (sans backticks):
{{"libelle_agent":"nom lisible pour agent non technicien", "seuils":[{{"max":{stats.get('p25',0):.4f},"label":"label<=p25"}},{{"max":{stats.get('p50',0):.4f},"label":"label p25-p50"}},{{"max":{stats.get('p75',0):.4f},"label":"label p50-p75"}},{{"max":{stats.get('p95',0):.4f},"label":"label p75-p95"}},{{"max":999999,"label":"label>p95"}}], "gabarit_aggravant":"phrase avec {{label}} et {{valeur:.2f}}", "gabarit_attenuant":"phrase avec {{label}} et {{valeur:.2f}}", "gabarit_fallback":"phrase avec {{libelle}} {{direction}} {{shap_value:+.3f}}", "document_recommande":"document a demander si absent"}}"""


def call_llm(prompt, provider, api_key):
    """Appelle le LLM et retourne le texte brut."""
    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return response.text
    else:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text


def parse_json_response(text):
    """Extrait le JSON de la reponse LLM."""
    text = text.strip()
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return json.loads(text)


async def generate(run_id, dry_run=False, features_filter=None):
    artefacts_dir = os.getenv("ARTEFACTS_DIR", "./artefacts")
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "scoring_db")
    provider = os.getenv("LLM_PROVIDER", "gemini")
    api_key = os.getenv("GOOGLE_API_KEY") if provider == "gemini" else os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        print(f"ERREUR: Cle API manquante pour provider '{provider}'")
        sys.exit(1)

    stats_path = os.path.join(artefacts_dir, "feature_stats.json")
    if not os.path.exists(stats_path):
        print(f"ERREUR: feature_stats.json introuvable dans {artefacts_dir}")
        sys.exit(1)

    with open(stats_path, encoding="utf-8") as f:
        feature_stats = json.load(f)

    if features_filter:
        inconnues = features_filter - feature_stats.keys()
        if inconnues:
            print(f"ERREUR: feature(s) inconnue(s) dans feature_stats.json : {sorted(inconnues)}")
            sys.exit(1)
        feature_stats = {f: s for f, s in feature_stats.items() if f in features_filter}

    print(f"[generate_metadata] {len(feature_stats)} features a traiter (provider: {provider})")

    if dry_run:
        print("[DRY RUN] Mode simulation -- aucune ecriture MongoDB")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    now = datetime.now(timezone.utc)
    success = 0
    errors = 0

    for feature, stats in feature_stats.items():
        ancien = await db.feature_metadata.find_one(
            {"run_id": run_id, "feature": feature}, {"_id": 0, "document_recommande": 1}
        )
        ancien_document = ancien.get("document_recommande") if ancien else None

        print(f"  Traitement: {feature}...", end=" ")
        prompt = build_prompt(feature, stats)
        llm_result = None

        for attempt in range(3):
            try:
                raw = call_llm(prompt, provider, api_key)
                llm_result = parse_json_response(raw)
                break
            except Exception as e:
                print(f"(tentative {attempt+1}/3 echouee: {e})", end=" ")

        if llm_result is None:
            print("FALLBACK")
            llm_result = {k: (v.replace("{feature}", feature) if isinstance(v, str) else v) for k, v in FALLBACK_TEMPLATE.items()}
            errors += 1
        else:
            print("OK")
            success += 1

        doc = {
            "run_id": run_id,
            "feature": feature,
            "famille": stats.get("famille", "inconnu"),
            "iv": stats.get("iv", 0),
            "type": stats.get("type", "numeric"),
            "is_declarative": stats.get("is_declarative", False),
            "champs_source": stats.get("champs_source", []),
            "formule": stats.get("formule"),
            "libelle_agent": llm_result.get("libelle_agent", feature),
            "seuils": llm_result.get("seuils", []),
            "gabarit_aggravant": llm_result.get("gabarit_aggravant", ""),
            "gabarit_attenuant": llm_result.get("gabarit_attenuant", ""),
            "gabarit_fallback": llm_result.get("gabarit_fallback", ""),
            "document_recommande": llm_result.get("document_recommande", ""),
            "valide_par": None,
            "valide_le": None,
            "genere_le": now,
        }

        if dry_run:
            print(f"    ancien document_recommande : {ancien_document!r}")
            print(f"    nouveau document_recommande: {doc['document_recommande']!r}")
        else:
            await db.feature_metadata.update_one(
                {"run_id": run_id, "feature": feature},
                {"$set": doc},
                upsert=True
            )

    print(f"\n[OK] {success} features generees, {errors} fallbacks")
    if not dry_run:
        print(f"[OK] feature_metadata insere dans MongoDB (run_id={run_id})")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", default="lgbm-run-v1")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--features", default=None, help="Sous-ensemble a regenerer, separe par des virgules (ex: EXT_SOURCE_1,EXT_SOURCE_2). Toutes les features si omis.")
    args = parser.parse_args()
    features_filter = set(f.strip() for f in args.features.split(",")) if args.features else None
    asyncio.run(generate(args.run_id, args.dry_run, features_filter))
