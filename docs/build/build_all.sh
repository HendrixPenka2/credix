#!/usr/bin/env bash
# Fabrique tous les PDF du dossier de remise, puis le PDF regroupé.
# Usage (depuis la racine du dépôt) : docs/build/build_all.sh
# Les schémas Mermaid du guide 3 sont déjà fabriqués (docs/images/mermaid/) : ils ne sont pas refaits ici.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
cd "$ROOT"
B="$HERE/build_pdf.sh"
P="docs/pdf"
mkdir -p "$P"

echo "== 1/7 README";            "$B" README.md "$P/01_README.pdf" "CREDIX" "Guide de récupération, de lancement et de test" "README CREDIX"
echo "== 2/7 Guide 1";           "$B" docs/guides/01_outils_claude.md "$P/02_Guide1_Outils_Claude.pdf" "Guide 1 : les outils Claude" "Abonnements, sessions, mode Projet et Claude Code" "Guide 1 : outils Claude"
echo "== 3/7 Guide 2";           "$B" docs/guides/02_methode_conception.md "$P/03_Guide2_Methode_de_conception.pdf" "Guide 2 : la méthode de conception" "Concevoir une application avec Claude, de A à Z" "Guide 2 : méthode"
echo "== 4/7 Guide 3";           "$B" docs/guides/03_conception_MVP.md "$P/04_Guide3_Conception_MVP.pdf" "Guide 3 : conception du MVP" "Un scoring de crédit réduit, à construire avec Claude Code" "Guide 3 : MVP"
echo "== 5/7 Fiche de démo";     "$B" docs/guides/00_fiche_demo.md "$P/05_Fiche_de_demonstration.pdf" "Fiche de démonstration" "Déroulé de la séance avec l'encadrant" "Fiche de démonstration"
echo "== 6/7 Guide 4";           "$B" docs/guides/04_autres_fonctions_claude.md "$P/06_Guide4_Autres_fonctions_Claude.pdf" "Guide 4 : autres fonctions de Claude" "Fichiers Excel, Word, PowerPoint, Skills, artefacts, connecteurs" "Guide 4 : autres fonctions"

echo "== 7/7 Dossier de remise regroupé"
DOCS=("$P/01_README.pdf" "$P/02_Guide1_Outils_Claude.pdf" "$P/03_Guide2_Methode_de_conception.pdf" "$P/04_Guide3_Conception_MVP.pdf" "$P/05_Fiche_de_demonstration.pdf")
NOMS=("README : récupérer, lancer et tester CREDIX" "Guide 1 : les outils Claude" "Guide 2 : la méthode de conception" "Guide 3 : conception du MVP (test en direct)" "Fiche de démonstration")
ROLES=("Partie 1 : vérifier que le projet fonctionne" "Partie 2 : comprendre les outils" "Partie 2 : comprendre la méthode" "Partie 3 : tester la méthode sur un exemple" "Le déroulé de la séance")
TMPD="$(mktemp -d)"; trap 'rm -rf "$TMPD"' EXIT
gen_sommaire() {  # $1 = nombre de pages du sommaire (décalage)
  local off="$1" start=$(( $1 + 1 )) i n
  {
    echo "# Contenu du dossier"
    echo
    echo "Ce dossier réunit tout ce qu'il faut pour **récupérer**, **lancer** et **tester** le projet CREDIX, puis pour **comprendre** comment il a été conçu avec Claude et **tester la méthode** sur un exemple."
    echo
    echo "Chaque document a sa propre page de garde. La colonne « Page » indique la page de ce fichier où commence le document."
    echo
    echo "| N° | Document | Rôle | Page |"
    echo "|---|---|---|---|"
    for i in "${!DOCS[@]}"; do
      n=$(pdfinfo "${DOCS[$i]}" | awk '/^Pages:/{print $2}')
      echo "| $((i+1)) | ${NOMS[$i]} | ${ROLES[$i]} | $start |"
      start=$(( start + n ))
    done
    echo
    echo "## Par où commencer"
    echo
    echo "1. **Lisez la fiche de démonstration** : elle décrit la séance en trois parties."
    echo "2. **Partie 1** : suivez le README pour récupérer le projet depuis GitHub, le lancer et le tester."
    echo "3. **Partie 2** : lisez les guides 1 et 2, qui expliquent les outils et la méthode."
    echo "4. **Partie 3** : le guide 3 contient le document de conception à confier à Claude Code."
    echo
    echo "## À part"
    echo
    echo "Le **guide 4** (autres fonctions de Claude : fichiers Excel, Word, PowerPoint, Skills, connecteurs, PDF à partir de Markdown) est un document séparé : \`06_Guide4_Autres_fonctions_Claude.pdf\`."
    echo
    echo "## Les sources"
    echo
    echo "Les documents sont écrits en Markdown (dossier \`docs/guides/\`) et fabriqués en PDF avec \`docs/build/build_all.sh\`. Le Markdown est la source : si vous corrigez un texte, refaites les PDF."
  } > "$TMPD/sommaire.md"
}
gen_sommaire 0
NOTOC=1 "$B" "$TMPD/sommaire.md" "$TMPD/sommaire.pdf" "Dossier de remise" "Projet CREDIX : README et guides" "Dossier de remise" >/dev/null
NS=$(pdfinfo "$TMPD/sommaire.pdf" | awk '/^Pages:/{print $2}')
gen_sommaire "$NS"
NOTOC=1 "$B" "$TMPD/sommaire.md" "$TMPD/sommaire.pdf" "Dossier de remise" "Projet CREDIX : README et guides" "Dossier de remise" >/dev/null
pdfunite "$TMPD/sommaire.pdf" "${DOCS[@]}" "$P/00_Dossier_de_remise.pdf"
echo "PDF regroupé : $P/00_Dossier_de_remise.pdf ($(pdfinfo "$P/00_Dossier_de_remise.pdf" | awk '/^Pages:/{print $2}') pages)"
echo
for f in "$P"/*.pdf; do printf '%-55s %3s pages  %s\n' "$f" "$(pdfinfo "$f" | awk '/^Pages:/{print $2}')" "$(du -h "$f" | cut -f1)"; done
