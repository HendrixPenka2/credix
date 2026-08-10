#!/usr/bin/env bash

# Utilisation : ./scanner.sh [chemin_du_projet]
PROJECT_PATH="${1:-.}"
OUTPUT_FILE="contexte_fastapi.txt"

# Résolution du chemin absolu
PROJECT_PATH=$(readlink -f "$PROJECT_PATH")
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "\e[31mErreur : Répertoire invalide : $PROJECT_PATH\e[0m"
    exit 1
fi

OUTPUT_PATH="$PROJECT_PATH/$OUTPUT_FILE"
rm -f "$OUTPUT_PATH"

# --- CONFIGURATION FASTAPI ---
# Dossiers à ignorer (Patterns larges)
EXCLUDE_DIRS=(
    ".git" "__pycache__" "venv" ".venv" "env" "node_modules" 
    ".idea" ".vscode" ".pytest_cache" "alembic"
)

# Fichiers vitaux à inclure même si le dossier est ignoré (ex: env.py dans alembic)
ALWAYS_INCLUDE=(
    "main.py" "models.py" "schemas.py" "crud.py" "database.py" 
    "dependencies.py" "config.py" "routers.py" "env.py" "settings.py"
)

# Extensions autorisées (+ toml pour pyproject.toml)
ALLOWED_EXTENSIONS=("py" "md" "yml" "yaml" "txt" "sh" "html" "toml")
# -----------------------------

echo -e "\e[36mScan du backend FastAPI en cours dans : $PROJECT_PATH\e[0m"

# Fichier temporaire pour lister les chemins
TMP_LIST=$(mktemp)

# 1. Construction dynamique des arguments pour find (très rapide et gère les espaces)
FIND_ARGS=()
for dir in "${EXCLUDE_DIRS[@]}"; do
    FIND_ARGS+=("-name" "$dir" "-prune" "-o")
done

EXT_ARGS=()
for ext in "${ALLOWED_EXTENSIONS[@]}"; do
    if [ ${#EXT_ARGS[@]} -eq 0 ]; then
        EXT_ARGS+=("-name" "*.$ext")
    else
        EXT_ARGS+=("-o" "-name" "*.$ext")
    fi
done
# Ajout manuel de fichiers sans extension classique
EXT_ARGS+=("-o" "-name" "Dockerfile" "-o" "-name" "Makefile" "-o" "-name" ".env.example")

# Exécution de la recherche principale
find "$PROJECT_PATH" "${FIND_ARGS[@]}" -type f \( "${EXT_ARGS[@]}" \) -print > "$TMP_LIST"

# 2. Récupération des fichiers ALWAYS_INCLUDE dans les dossiers exclus
for dir in "${EXCLUDE_DIRS[@]}"; do
    if [ -d "$PROJECT_PATH/$dir" ]; then
        for file in "${ALWAYS_INCLUDE[@]}"; do
            find "$PROJECT_PATH/$dir" -type f -name "$file" -print 2>/dev/null >> "$TMP_LIST"
        done
    fi
done

# 3. Nettoyage de la liste (chemins uniques, exclusion du script lui-même et de l'output)
FINAL_LIST=$(mktemp)
sort -u "$TMP_LIST" | grep -v "$OUTPUT_FILE" | grep -v "$(basename "$0")" > "$FINAL_LIST"

# 4. Écriture du fichier final
{
    echo "# CONTEXTE BACKEND - FastAPI"
    echo "# Généré le : $(date +'%Y-%m-%d %H:%M')"
    echo "# Racine : $PROJECT_PATH"
    echo "==============================================="
} > "$OUTPUT_PATH"

count=0
while IFS= read -r file; do
    # Récupération de la taille en octets (compatible Linux standard)
    size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    
    # Exclusion des fichiers vides ou supérieurs à 500 Ko
    if [ "$size" -lt 512000 ] && [ "$size" -gt 0 ]; then
        ((count++))
        # Extraction du chemin relatif pour un affichage propre
        rel_path="${file#$PROJECT_PATH/}"
        
        echo "" >> "$OUTPUT_PATH"
        echo "// FILE: $rel_path" >> "$OUTPUT_PATH"
        echo "-----------------------------------------------" >> "$OUTPUT_PATH"
        
        cat "$file" >> "$OUTPUT_PATH"
        
        # S'assurer qu'il y a un retour à la ligne à la fin du fichier copié
        [ -n "$(tail -c1 "$file")" ] && echo "" >> "$OUTPUT_PATH"
        
        echo "" >> "$OUTPUT_PATH"
        echo "// END OF FILE: $rel_path" >> "$OUTPUT_PATH"

        if (( count % 20 == 0 )); then
            echo -e "\e[90m -> $count fichiers traités...\e[0m"
        fi
    fi
done < "$FINAL_LIST"

# Nettoyage des fichiers temporaires
rm -f "$TMP_LIST" "$FINAL_LIST"

# Calcul du poids final
size_kb=$(du -k "$OUTPUT_PATH" | cut -f1)
echo -e "\e[32mSuccès ! $count fichiers intégrés - ${size_kb} Ko\e[0m"
echo -e "Fichier disponible ici : $OUTPUT_PATH"