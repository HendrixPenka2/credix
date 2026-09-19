# Données de démonstration

Ce dossier permet de tester CREDIX **sans clé API Gemini et sans télécharger les données Kaggle**.

| Fichier | Contenu | Chargé par |
|---|---|---|
| `feature_metadata.json` | 27 phrases d'explication, une par variable du modèle (libellé, seuils, gabarits de phrases, document recommandé). Elles ont été générées une fois avec Gemini, puis figées dans ce fichier. | `scripts/import_metadata.py` |
| `clients_demo.json` | 150 clients de démonstration : profil et 27 variables de chacun. | `scripts/import_demo_clients.py` |

Les deux fichiers sont chargés d'un coup par `scripts/init_demo.py` (procédure complète dans le `README.md` à la racine du dépôt).

## Origine des clients

- Les 150 clients sont extraits de `application_test.csv`, du jeu **Home Credit Default Risk** (compétition Kaggle). Les noms et prénoms sont fictifs.
- Les données d'origine restent soumises aux conditions d'utilisation de la compétition Kaggle. Cet extrait est fourni pour la démonstration académique du projet.
- Choix des clients (sans tirage au hasard) :
  - 5 clients de référence, déjà scorés lors des essais de l'auteur : `HC-100001`, `HC-100042`, `HC-100141`, `HC-100271`, `HC-101449` ;
  - 20 clients aux données les plus incomplètes (6 à 10 variables vides sur 27), utiles pour voir la couverture ρc faible ;
  - 125 clients pris à intervalle régulier parmi les autres.
- Le résultat d'un scoring précédent et la couverture ρc ne sont **pas** fournis : ils sont calculés quand on score le client dans l'application.

## Régénérer ces fichiers (pour l'auteur du projet)

Les phrases et les clients viennent de la base MongoDB de l'auteur :

```bash
docker compose exec -T api python scripts/export_metadata.py > demo_data/feature_metadata.json
docker compose exec -T api python scripts/export_demo_clients.py > demo_data/clients_demo.json
```

Pour **réécrire** les phrases avec un modèle de langage (clé API Gemini ou Anthropic nécessaire) au lieu de reprendre celles-ci : `scripts/generate_metadata.py`.
