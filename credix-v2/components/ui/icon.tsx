import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Nom de l'icône Material Symbols Outlined (ex: "dashboard", "search", "arrow_forward"). */
  name: string;
  /** FILL=1 pour la variante "remplie" utilisée sur quelques accents de marque. */
  filled?: boolean;
  size?: number;
}

/**
 * Toutes les maquettes Stitch validées utilisent exclusivement Google
 * "Material Symbols Outlined" (jamais d'emoji, jamais lucide) — ce wrapper
 * est le seul point d'entrée pour afficher une icône dans tout le projet.
 */
export function Icon({ name, filled = false, size = 24, className, style, ...props }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
