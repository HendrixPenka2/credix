import { clamp } from "@/lib/design-tokens";

const CX = 100;
const CY = 90;
const R = 80;
const CAP = 0.4; // plafond d'affichage — au-delà, l'aiguille reste en butée mais la valeur exacte est affichée en chiffres
const SEUIL_ATTENTION = 0.1;
const SEUIL_DERIVE = 0.25;

function angleFor(ratio: number) {
  return Math.PI * (1 - ratio);
}

function pointFor(ratio: number) {
  const a = angleFor(ratio);
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
}

function arcPath(ratioStart: number, ratioEnd: number) {
  const p1 = pointFor(ratioStart);
  const p2 = pointFor(ratioEnd);
  return `M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`;
}

export interface PsiGaugeProps {
  value: number;
  size?: number;
}

/**
 * Jauge PSI segmentée (stable/attention/dérive) — demi-cercle + aiguille,
 * référence : d_rive_du_mod_le_psi_credix_ai_2 (seule maquette conforme à
 * DESIGN.md sur la forme des jauges).
 */
export function PsiGauge({ value, size = 260 }: PsiGaugeProps) {
  const ratioAttention = SEUIL_ATTENTION / CAP;
  const ratioDerive = SEUIL_DERIVE / CAP;
  const ratioValue = clamp(value / CAP, 0, 1);
  const needleLength = R - 16;
  const needleAngle = angleFor(ratioValue);
  const needleX = CX + needleLength * Math.cos(needleAngle);
  const needleY = CY - needleLength * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 200 100" width={size} height={size / 2}>
        <path d={arcPath(0, ratioAttention)} fill="none" stroke="#10b981" strokeWidth={16} strokeLinecap="round" />
        <path d={arcPath(ratioAttention, ratioDerive)} fill="none" stroke="#f59e0b" strokeWidth={16} />
        <path d={arcPath(ratioDerive, 1)} fill="none" stroke="#f43f5e" strokeWidth={16} strokeLinecap="round" />
        <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke="var(--on-surface)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={6} fill="var(--on-surface)" />
      </svg>
      <p className="font-display-lg text-on-surface -mt-1 tabular-nums">{value.toFixed(3)}</p>
      <div className="flex justify-between w-full font-label-md text-outline px-2">
        <span>0.00</span>
        <span>{CAP.toFixed(2)}+</span>
      </div>
    </div>
  );
}
