#!/bin/bash

# Configuration
OUTPUT_FILE="contexte_frontend_CREDIX.txt"
PROJECT_PATH="${1:-.}"

# Listes d'exclusions
EXCLUDE_DIRS=(".git" ".vscode" ".idea" "node_modules" ".next" "out" "build" "coverage" "public" "dist" ".vercel")
EXCLUDE_FILES=("*.log" "package-lock.json" "yarn.lock" "pnpm-lock.yaml" "bun.lockb" ".env*" "*.ico" "*.png" "*.jpg" "*.jpeg" "*.svg" "*.webp" "*.pdf" "*.map" "*.ttf" "*.woff" "*.woff2" "*.eot" "*.mp4" "$OUTPUT_FILE" "contexte_frontend" "contexte_admin")

# Construction optimisée de la commande find
PRUNE_EXPR=()
for dir in "${EXCLUDE_DIRS[@]}"; do
    if [ ${#PRUNE_EXPR[@]} -gt 0 ]; then
        PRUNE_EXPR+=("-o" "-name" "$dir")
    else
        PRUNE_EXPR+=("-name" "$dir")
    fi
done

FILE_EXPR=()
for pattern in "${EXCLUDE_FILES[@]}"; do
    FILE_EXPR+=("-not" "-name" "$pattern")
done

echo -e "\e[36mRecherche des fichiers en cours...\e[0m"

# Trouver tous les fichiers valides
# On met les résultats dans un tableau pour pouvoir compter (évite le bug du subshell)
mapfile -d '' FOUND_FILES < <(find "$PROJECT_PATH" \( "${PRUNE_EXPR[@]}" \) -prune -o -type f "${FILE_EXPR[@]}" -print0)

echo -e "\e[90m  -> ${#FOUND_FILES[@]} fichiers trouvés.\e[0m"

echo -e "\e[36mGénération du fichier de contexte en cours...\e[0m"

# ==============================================================================
# FIX PRINCIPAL : On utilise une seule redirection { ... } > "$OUTPUT_FILE" 
# pour écrire tout le contenu d'un coup. (Equivalent au StreamWriter)
# ==============================================================================

{
    # Écriture de l'en-tête
    echo "Next.js Project Context"
    echo "Generated On: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Root: $(realpath "$PROJECT_PATH")"
    echo "==============================================="

    count=0
    for filepath in "${FOUND_FILES[@]}"; do
        ((count++))
        
        # Obtenir le chemin relatif propre
        rel_path="${filepath#$PROJECT_PATH/}"
        rel_path="${rel_path#./}"
        
        echo ""
        echo "// FILE: $rel_path"
        echo "-----------------------------------------------"
        
        # Test si le fichier est binaire
        # file -b --mime-encoding retourne 'binary' pour les fichiers non textuels
        mime_encoding=$(file -b --mime-encoding "$filepath")
        if [[ "$mime_encoding" == "binary" ]]; then
            echo "[Fichier binaire ou asset omis]"
        else
            cat "$filepath" 2>/dev/null || echo "[Erreur lors de la lecture du fichier]"
            
            # S'assurer qu'on termine par un saut de ligne 
            if [ -s "$filepath" ] && [ "$(tail -c 1 "$filepath" | wc -l)" -eq 0 ]; then
                echo ""
            fi
        fi
        
        echo ""
        echo "// END OF FILE: $rel_path"

        # Progression envoyée vers stderr (pour ne pas finir dans le fichier texte !!)
        if [ $((count % 50)) -eq 0 ]; then
            echo -e "\e[90m  -> $count / ${#FOUND_FILES[@]} fichiers traités...\e[0m" >&2
        fi
    done
} > "$OUTPUT_FILE"

# Formatage final
size_bytes=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE")
size_mb=$(awk "BEGIN {printf \"%.2f\", $size_bytes / 1048576}")

echo ""
echo -e "\e[32mSuccès ! Contexte Next.js prêt :\e[0m"
echo -e "\e[32m  Fichier : $OUTPUT_FILE\e[0m"
echo -e "\e[32m  Fichiers inclus : ${#FOUND_FILES[@]}\e[0m"
echo -e "\e[32m  Taille : $size_mb MB\e[0m"
