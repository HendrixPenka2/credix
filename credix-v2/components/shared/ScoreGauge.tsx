import { getDecisionStyle } from "@/lib/design-tokens";
import { scoreToRatio, SCORE_MIN, SCORE_MAX } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const CX = 100;
const CY = 90;
const R = 80;
const ARC_LENGTH = Math.PI * R; // longueur d'un demi-cercle de rayon R

export interface ScoreGaugeProps {
  score: number;
  decision?: string | null;
  size?: number;
  showNeedle?: boolean;
  label?: string;
  className?: string;
}

/**
 * Jauge de score PDO (300-850) — demi-cercle + aiguille, conforme à
 * DESIGN.md ("Gauges should be rendered as semi-circles with rounded
 * end-caps") et retenue comme référence canonique (d_rive_du_mod_le_psi_
 * credix_ai_2) plutôt que le donut plein cercle utilisé par erreur sur
 * la majorité des autres maquettes (cf. audit design, incohérence à corriger).
 */
export function ScoreGauge({ score, decision, size = 220, showNeedle = true, label, className }: ScoreGaugeProps) {
  const ratio = scoreToRatio(score);
  const color = decision ? getDecisionStyle(decision).hex : "#4648d4";

  const angleRad = Math.PI * (1 - ratio);
  const needleLength = R - 16;
  const needleX = CX + needleLength * Math.cos(angleRad);
  const needleY = CY - needleLength * Math.sin(angleRad);

  return (
    <div className={cn("flex flex-col items-center", className)} style={{ width: size }}>
      <svg viewBox="0 0 200 100" width={size} height={size / 2}>
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--outline-variant)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={ARC_LENGTH * (1 - ratio)}
        />
        {showNeedle && (
          <>
            <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke="var(--on-surface)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={6} fill="var(--on-surface)" />
          </>
        )}
      </svg>
      <div className="text-center -mt-1">
        <span className="font-display-lg text-on-surface tabular-nums">{Math.round(score)}</span>
        {label && <p className="font-label-md text-on-surface-variant mt-1">{label}</p>}
      </div>
      <div className="flex justify-between w-full font-label-md text-outline px-2 -mt-1">
        <span>{SCORE_MIN}</span>
        <span>{SCORE_MAX}</span>
      </div>
    </div>
  );
}
