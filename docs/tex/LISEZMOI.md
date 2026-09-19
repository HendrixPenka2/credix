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

## Ajouter ou changer une image

**Façon recommandée : passer par le Markdown.**

1. Déposez le fichier PNG dans `docs/images/guides/` (ou `docs/images/readme/` pour le README).
2. Dans le `.md` du document, écrivez à l'endroit voulu la ligne de l'image, puis sa légende (guide 4, section 8.3).
3. Lancez `docs/build/build_all.sh` : les `.tex` et les PDF sont refaits.

Une image n'est insérée **que si son fichier existe**. Sinon, le script l'ignore (et le signale à l'écran) : le texte reste, sans figure.

**Directement dans le `.tex`.** Chaque image y est un bloc LaTeX standard, précédé d'un commentaire qui donne le nom du fichier :

```text
% CAPTURE : 01-01_claude_ai_accueil.png : Page d'accueil de claude.ai
\begin{figure}[H]
  \centering
  \includegraphics[width=\linewidth,height=0.75\textheight,keepaspectratio]{../images/guides/01-01_claude_ai_accueil.png}
  \caption{La page d'accueil de claude.ai.}
\end{figure}
```

Pour changer l'image, **changez seulement le nom du fichier** dans `\includegraphics{...}`. Le chemin est relatif à **ce dossier** (`docs/tex/`), d'où le `../images/`. Pour ajouter une image, copiez un bloc existant et changez le nom. Le texte sous l'image se change avec `\caption{...}`. Puis recompilez.

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
