# Fichiers LaTeX du dossier de remise

Chaque document existe en **trois formats** :

| Format | Où | Rôle |
|---|---|---|
| **Markdown** (`.md`) | `README.md` et `docs/guides/` | La **source** : on écrit et on corrige ici |
| **LaTeX** (`.tex`) | ce dossier | Le code de mise en page : pour **insérer des images** ou changer la présentation |
| **PDF** | `docs/pdf/` | Le document final à lire ou à envoyer |

Le PDF est **compilé à partir du `.tex`**, lui-même fabriqué à partir du Markdown.

## Compiler un fichier `.tex`

À installer une seule fois (Linux Ubuntu ou Debian) :

```bash
sudo apt update
sudo apt install texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-lang-french
```

Puis, depuis ce dossier, **deux fois** de suite (la deuxième met à jour la table des matières) :

```bash
cd docs/tex
pdflatex 02_Guide1_Outils_Claude.tex
pdflatex 02_Guide1_Outils_Claude.tex
```

Le PDF est créé **à côté du `.tex`** (les fichiers `.aux`, `.log`, `.out`, `.toc`, `.pdf` de ce dossier sont ignorés par Git).

## Insérer une capture d'écran

**Façon 1, sans rien modifier dans le `.tex`.** Chaque cadre « CAPTURE À INSÉRER » affiche le nom du fichier attendu, par exemple `../images/guides/01-01_claude_ai_accueil.png`. Déposez votre image **sous ce nom exact** dans `docs/images/guides/` (ou `docs/images/readme/` pour le README), puis recompilez : l'image remplace le cadre.

**Façon 2, en modifiant le `.tex`.** Cherchez la commande du cadre :

```text
\CredixCapture{Description}{../images/guides/01-01_claude_ai_accueil.png}
```

et remplacez-la par :

```text
\begin{center}
  \includegraphics[width=\linewidth]{../images/guides/mon_image.png}
\end{center}
```

Les chemins d'images sont relatifs à **ce dossier** (`docs/tex/`), d'où le `../images/`.

## Refaire tous les fichiers d'un coup

Depuis la racine du dépôt :

```bash
docs/build/build_all.sh
```

Cette commande **réécrit** tous les `.tex` et tous les PDF à partir du Markdown. Les modifications faites directement dans un `.tex` seraient alors **perdues** : choisissez une seule source, le Markdown (recommandé) ou le `.tex`.

## Liste des fichiers

| Fichier | Document |
|---|---|
| `01_README.tex` | README : récupérer, lancer et tester CREDIX |
| `02_Guide1_Outils_Claude.tex` | Guide 1 : les outils Claude |
| `03_Guide2_Methode_de_conception.tex` | Guide 2 : la méthode de conception |
| `04_Guide3_Conception_MVP.tex` | Guide 3 : conception du MVP |
| `05_Fiche_de_demonstration.tex` | Fiche de démonstration |
| `06_Guide4_Autres_fonctions_Claude.tex` | Guide 4 : autres fonctions de Claude |
