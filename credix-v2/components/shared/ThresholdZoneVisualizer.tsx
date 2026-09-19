import { cn } from "@/lib/utils";

export interface ThresholdZoneVisualizerProps {
  min: number;
  max: number;
  /** Seuil refusé/revue. */
  threshold1: number;
  /** Seuil revue/accordé. */
  threshold2: number;
  formatValue?: (v: number) => string;
  className?: string;
}

/**
 * Barre 3 zones (refusé/revue/accordé) avec marqueurs de seuils — référence :
 * configuration_des_seuils_admin. Réutilisé par /admin/configuration et
 * /superviseur/distribution.
 */
export function ThresholdZoneVisualizer({ min, max, threshold1, threshold2, formatValue = String, className }: ThresholdZoneVisualizerProps) {
  const span = max - min;
  const pct1 = ((threshold1 - min) / span) * 100;
  const pct2 = ((threshold2 - min) / span) * 100;

  return (
    <div className={cn("pt-2", className)}>
      <div className="flex justify-between font-label-md text-outline mb-2">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <div className="h-4 rounded-full flex overflow-hidden">
        <div className="bg-danger-rose" style={{ width: `${pct1}%` }} />
        <div className="bg-warning-amber" style={{ width: `${pct2 - pct1}%` }} />
        <div className="bg-success-emerald" style={{ width: `${100 - pct2}%` }} />
      </div>
      <div className="relative h-10 mt-1">
        <ThresholdMarker pct={pct1} value={formatValue(threshold1)} />
        <ThresholdMarker pct={pct2} value={formatValue(threshold2)} />
      </div>
    </div>
  );
}

function ThresholdMarker({ pct, value }: { pct: number; value: string }) {
  return (
    <div className="absolute top-0 flex flex-col items-center -translate-x-1/2" style={{ left: `${pct}%` }}>
      <div className="w-px h-2 bg-on-surface-variant" />
      <span className="mt-1 rounded-md border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 font-mono text-[11px] text-on-surface whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}
