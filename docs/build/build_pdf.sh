#!/usr/bin/env bash
# Fabrique, à partir d'un fichier Markdown : un fichier LaTeX (.tex) autonome, puis le PDF compilé depuis ce .tex.
# Usage : docs/build/build_pdf.sh <fichier.md> <sortie.pdf> "<Titre>" "<Sous-titre>" ["<Titre court>"]
# Exemple : docs/build/build_pdf.sh README.md docs/pdf/01_README.pdf "CREDIX" "Guide de récupération, lancement et test"
# Le .tex porte le même nom que le PDF : il est écrit dans docs/tex/ si le PDF est dans docs/pdf/,
# sinon à côté du PDF.
# Variables facultatives : NOTOC=1 (pas de table des matières), TEXDIR=<dossier des .tex>.
# Les images sont cherchées à la compilation, par rapport au dossier du .tex (ex. ../images/guides/...).
set -euo pipefail
SRC="$1"; OUT="$2"; TITRE="$3"; SOUS="$4"; COURT="${5:-$3}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC_ABS="$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")"
mkdir -p "$(dirname "$OUT")"
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
NAME="$(basename "$OUT_ABS" .pdf)"
if [ -z "${TEXDIR:-}" ]; then
  if [ "$(basename "$(dirname "$OUT_ABS")")" = "pdf" ]; then TEXDIR="$(dirname "$OUT_ABS")/../tex"; else TEXDIR="$(dirname "$OUT_ABS")"; fi
fi
mkdir -p "$TEXDIR"; TEXDIR="$(cd "$TEXDIR" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
DATE="$(date +'%d/%m/%Y')"
# Page de garde : bandeau bleu (établissement), titre, sous-titre, auteur
cat > "$TMP/cover.tex" <<COVER
\\begin{titlepage}
\\thispagestyle{empty}
\\begin{tikzpicture}[remember picture,overlay]
  \\fill[credixblue] (current page.north west) rectangle ([yshift=-8cm]current page.north east);
  \\fill[credixaccent] ([yshift=-8cm]current page.north west) rectangle ([yshift=-8.25cm]current page.north east);
\\end{tikzpicture}
\\noindent
{\\color{white}
\\vspace*{0.3cm}
{\\large\\bfseries\\textsc{Projet de fin d'études}\\par}
\\vspace{0.6cm}
{\\Large École Nationale Supérieure Polytechnique de Yaoundé\\par}
\\vspace{0.15cm}
{\\Large Université de Yaoundé I\\par}
\\vspace{0.9cm}
{\\normalsize Diplôme d'Ingénieur de Conception en Génie Informatique\\par}
{\\normalsize Année académique 2025--2026\\par}
}
\\vspace{2.8cm}
\\noindent{\\fontsize{28}{34}\\selectfont\\bfseries\\color{credixblue} ${TITRE}\\par}
\\vspace{0.6cm}
\\noindent{\\Large\\color{credixgray} ${SOUS}\\par}
\\vspace{0.8cm}
\\noindent{\\color{credixaccent}\\rule{4cm}{2.5pt}\\par}
\\vfill
\\noindent{\\small\\color{credixgray} Présenté par\\par}
\\vspace{0.1cm}
\\noindent{\\Large\\bfseries SINGHE PENKA Hendrix Donavan\\par}
\\vspace{0.7cm}
\\noindent{\\small\\color{credixgray} Version du ${DATE}\\par}
\\end{titlepage}

COVER
# En-tête du .tex : explications, titre court pour l'en-tête de page, puis préambule commun
{
  echo "% Fichier LaTeX généré par docs/build/build_pdf.sh à partir de $(basename "$SRC_ABS")."
  echo "% Compilation (depuis le dossier de ce fichier), deux fois pour la table des matières :"
  echo "%   pdflatex $NAME.tex"
  echo "% Chaque image est un bloc \\begin{figure} ... \\includegraphics{fichier} ... \\end{figure}."
  echo "% Pour mettre votre capture : changez seulement le nom du fichier dans \\includegraphics{...}"
  echo "% (chemin relatif à ce dossier, par exemple ../images/guides/ma_capture.png), puis recompilez."
  echo "% Une image absente n'est pas insérée : le texte reste, sans figure."
  printf '\\newcommand{\\CredixShortTitle}{%s}\n' "$COURT"
  cat "$HERE/preamble.tex"
} > "$TMP/short.tex"
# Table des matières automatique (sauf si NOTOC=1)
TOCARGS="--toc --toc-depth=2"
if [ -n "${NOTOC:-}" ]; then TOCARGS=""; fi
# Markdown -> LaTeX (les chemins d'images sont réécrits par rapport à $TEXDIR)
cd "$(dirname "$SRC_ABS")"
export MDDIR="$(pwd)" TEXDIR
export DOCNAME="$(basename "$SRC_ABS" .md)"
pandoc "$(basename "$SRC_ABS")" -f gfm -t latex -s \
  --lua-filter="$HERE/credix.lua" \
  --include-in-header="$TMP/short.tex" \
  --include-before-body="$TMP/cover.tex" \
  $TOCARGS \
  -V documentclass=article -V papersize=a4 -V fontsize=11pt \
  -V geometry:margin=2.2cm \
  -V lang=fr -V colorlinks=true -V linkcolor=credixblue -V urlcolor=credixblue \
  -V title-meta="$TITRE" -V author-meta="SINGHE PENKA Hendrix Donavan" \
  -V toc-title="Table des matières" \
  --syntax-highlighting=none \
  -o "$TEXDIR/$NAME.tex"
# LaTeX -> PDF (fichiers intermédiaires dans un dossier temporaire)
cd "$TEXDIR"
run_latex() {
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$TMP" "$NAME.tex" >"$TMP/latex.out" 2>&1 || {
    echo "Erreur LaTeX pour $NAME.tex :" >&2; grep -A6 '^!' "$TMP/latex.out" | head -30 >&2; return 1; }
}
run_latex; run_latex
if grep -qi 'rerun' "$TMP/$NAME.log"; then run_latex; fi
cp "$TMP/$NAME.pdf" "$OUT_ABS"
# Contrôle : texte qui déborde de plus de 3 pt sur la droite (souvent un mot trop long dans une colonne étroite)
OVER="$( (grep -o 'Overfull \\hbox ([0-9.]*pt' "$TMP/$NAME.log" || true) | sed 's/.*(//; s/pt//' | awk '$1 > 3' | wc -l)"
if [ "$OVER" -gt 0 ]; then
  echo "Attention : $OVER débordement(s) horizontal(aux) de plus de 3 pt dans $NAME :" >&2
  (grep -A4 'Overfull \\hbox' "$TMP/$NAME.log" || true) | (grep -E 'Overfull|^l\.[0-9]+' || true) | head -20 >&2
fi
echo "PDF produit : $OUT ($(du -h "$OUT_ABS" | cut -f1)) ; LaTeX : $(basename "$TEXDIR")/$NAME.tex"
