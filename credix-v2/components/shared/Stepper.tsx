import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design-tokens";
import { TONE_SOLID_BG } from "./tone-classes";

export interface StepperProps {
  steps: string[];
  currentIndex: number;
  /** "page" = bandeau pleine page (création client/scoring), "modal" = en-tête de modale (upload modèle). */
  variant?: "page" | "modal";
  /** Couleur de l'étape active — noir par défaut, orange en mode simulation. */
  tone?: Tone;
  className?: string;
}

/**
 * Stepper 3 étapes — deux variantes retenues (page pleine largeur en carte,
 * ou compacte pour un en-tête de modale), cf. audit cross-cutting §10.
 * Un seul composant partagé pour toute l'app plutôt que les 4 implémentations
 * concurrentes trouvées dans les maquettes.
 */
export function Stepper({ steps, currentIndex, variant = "page", tone = "neutral", className }: StepperProps) {
  const dotSize = variant === "modal" ? "h-6 w-6" : "h-8 w-8";
  const content = (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  dotSize,
                  "rounded-full flex items-center justify-center font-label-md shrink-0 transition-colors",
                  done || active ? TONE_SOLID_BG[tone] : "bg-surface-container-high text-on-surface-variant"
                )}
              >
                {done ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <span className={cn("font-label-md whitespace-nowrap", active ? "text-on-surface" : "text-on-surface-variant")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-[2px] mx-3 mb-6", done ? TONE_SOLID_BG[tone].split(" ")[0] : "bg-outline-variant")} />
            )}
          </div>
        );
      })}
    </div>
  );

  if (variant === "modal") return <div className={className}>{content}</div>;

  return <div className={cn("rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-card-padding", className)}>{content}</div>;
}
