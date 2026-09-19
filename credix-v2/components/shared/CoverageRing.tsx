import { getRhoStyle } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;

export interface CoverageRingProps {
  rho: number; // 0 à 1
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Anneau de couverture ρc — la couleur est TOUJOURS dérivée du palier
 * (critique/partielle/suffisante, cf. getRhoStyle), jamais fixe : plusieurs
 * maquettes Stitch codaient cet anneau en violet en dur, bug à ne pas
 * reproduire (voir audit design, cross-cutting §5).
 */
export function CoverageRing({ rho, size = 96, strokeWidth = 10, showLabel = true, className }: CoverageRingProps) {
  const style = getRhoStyle(rho);
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, rho)));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle cx={50} cy={50} r={R} fill="none" stroke="var(--outline-variant)" strokeWidth={strokeWidth} />
        <circle
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke={style.hex}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data-lg text-on-surface tabular-nums" style={{ fontSize: size * 0.22 }}>
            {Math.round(rho * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
