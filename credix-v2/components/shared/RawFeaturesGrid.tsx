import { labelFor, formatFeatureValue } from "@/lib/feature-labels";

/**
 * Grille labellisée de variables brutes — remplace un dump JSON brut par un
 * composant structuré (libellé humain + valeur formatée), triée par ordre
 * alphabétique de libellé pour rester scannable.
 */
export function RawFeaturesGrid({ data }: { data: Record<string, any> }) {
  const rows = Object.entries(data)
    .map(([key, value]) => ({ key, label: labelFor(key), value: formatFeatureValue(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (rows.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 max-h-[32rem] overflow-y-auto custom-scrollbar p-1">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start justify-between gap-3 py-2 border-b border-outline-variant/30">
          <div className="min-w-0">
            <p className="font-body-sm text-on-surface">{r.label}</p>
            <p className="font-mono text-[10px] text-outline truncate">{r.key}</p>
          </div>
          <span className="font-mono text-on-surface-variant text-sm shrink-0 text-right">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
