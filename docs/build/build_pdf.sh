#!/usr/bin/env bash
# Fabrique un PDF (via LaTeX) à partir d'un fichier Markdown.
# Usage : docs/build/build_pdf.sh <fichier.md> <sortie.pdf> "<Titre>" "<Sous-titre>" ["<Titre court>"]
# Exemple : docs/build/build_pdf.sh README.md docs/pdf/README.pdf "CREDIX" "Guide de récupération, lancement et test"
# Les chemins d'images du .md sont résolus depuis le dossier du .md, comme sur GitHub.
set -euo pipefail
SRC="$1"; OUT="$2"; TITRE="$3"; SOUS="$4"; COURT="${5:-$3}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC_ABS="$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")"
mkdir -p "$(dirname "$OUT")"
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
DATE="$(date +'%d/%m/%Y')"
# Page de garde
cat > "$TMP/cover.tex" <<COVER
\\begin{titlepage}
\\thispagestyle{empty}
\\centering
\\vspace*{3.2cm}
{\\color{credixgray}\\large\\textsc{Projet de fin d'études --- ENSPY, Université de Yaoundé I}\\par}
\\vspace{2.2cm}
{\\Huge\\bfseries\\color{credixblue} ${TITRE}\\par}
\\vspace{0.8cm}
{\\Large ${SOUS}\\par}
\\vspace{2cm}
{\\color{credixblue}\\rule{0.5\\linewidth}{0.8pt}\\par}
\\vspace{1.2cm}
{\\large SINGHE PENKA Hendrix Donavan\\par}
{\\color{credixgray}Dépôt GitHub : HendrixPenka2/credix\\par}
\\vfill
{\\color{credixgray}\\small Version du ${DATE}\\par}
\\end{titlepage}

COVER
# Rappel du titre court pour l'en-tête
printf '\\newcommand{\\CredixShortTitle}{%s}\n' "$COURT" > "$TMP/short.tex"
cat "$HERE/preamble.tex" >> "$TMP/short.tex"
cd "$(dirname "$SRC_ABS")"
export DOCNAME="$(basename "$SRC_ABS" .md)"
# Table des matières automatique (sauf si NOTOC=1)
TOCARGS="--toc --toc-depth=2"
if [ -n "${NOTOC:-}" ]; then TOCARGS=""; fi
pandoc "$(basename "$SRC_ABS")" -f gfm -t latex \
  --pdf-engine=pdflatex \
  --lua-filter="$HERE/credix.lua" \
  --include-in-header="$TMP/short.tex" \
  --include-before-body="$TMP/cover.tex" \
  $TOCARGS \
  -V documentclass=article -V papersize=a4 -V fontsize=10pt \
  -V geometry:margin=2.2cm \
  -V lang=fr -V colorlinks=true -V linkcolor=credixblue -V urlcolor=credixblue \
  -V title-meta="$TITRE" -V author-meta="SINGHE PENKA Hendrix Donavan" \
  -V toc-title="Table des matières" \
  --syntax-highlighting=none \
  -o "$OUT_ABS"
echo "PDF produit : $OUT ($(du -h "$OUT_ABS" | cut -f1))"
