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

Dans chaque `.tex`, **chaque image est un bloc LaTeX standard**, précédé d'un commentaire qui indique le nom du fichier et ce qu'il faut montrer :

```text
% CAPTURE : 01-01_claude_ai_accueil.png : Page d'accueil de claude.ai avant la connexion
\begin{figure}[H]
  \centering
  \includegraphics[width=\linewidth,height=0.75\textheight,keepaspectratio]{../images/guides/01-01_claude_ai_accueil.png}
  \caption{Page d'accueil de claude.ai.}
\end{figure}
```

Pour mettre votre capture, **changez seulement le nom du fichier** dans `\includegraphics{...}`, puis recompilez. Le chemin est relatif à **ce dossier** (`docs/tex/`), d'où le `../images/`.

Deux façons de faire :

1. **Sans modifier le `.tex`** : déposez votre image **sous le nom exact** déjà écrit dans le bloc, dans `docs/images/guides/` (ou `docs/images/readme/` pour le README).
2. **En modifiant le `.tex`** : remplacez le nom du fichier par celui de votre image.

Tant que le fichier est absent, un cadre « CAPTURE À INSÉRER » s'affiche à sa place dans le PDF, et la compilation continue. Pour retrouver un bloc dans le `.tex`, cherchez le nom du fichier ou `CAPTURE :`. Le texte sous l'image se change avec `\caption{...}`.

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
