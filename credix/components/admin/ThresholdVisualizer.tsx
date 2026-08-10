// DESTINATION: components/admin/ThresholdVisualizer.tsx
'use client';

interface Props { refuse: number; accorde: number; min?: number; max?: number; }

export function ThresholdVisualizer({ refuse, accorde, min = 300, max = 850 }: Props) {
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  const r = clamp(refuse);
  const a = clamp(accorde);
  const valid = r < a && !Number.isNaN(r) && !Number.isNaN(a);
  const total = max - min;
  const wRefuse  = valid ? ((r - min) / total) * 100 : 0;
  const wRevue   = valid ? ((a - r) / total) * 100 : 0;
  const wAccorde = valid ? ((max - a) / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {valid ? (
          <>
            <div style={{ width: `${wRefuse}%` }} className="bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center transition-all duration-200">
              {wRefuse > 14 && <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">REFUSÉ</span>}
            </div>
            <div style={{ width: `${wRevue}%` }} className="bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-x-2 border-white dark:border-slate-900 transition-all duration-200">
              {wRevue > 14 && <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">REVUE MANUELLE</span>}
            </div>
            <div style={{ width: `${wAccorde}%` }} className="bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center transition-all duration-200">
              {wAccorde > 14 && <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">ACCORDÉ</span>}
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-center text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20">
            Le seuil REFUSÉ doit être strictement inférieur au seuil ACCORDÉ
          </div>
        )}
      </div>
      <div className="relative h-4 text-[10px] font-mono text-slate-400 dark:text-slate-500">
        <span className="absolute left-0">{min}</span>
        {valid && <span className="absolute text-rose-500 font-semibold" style={{ left: `${wRefuse}%`, transform: 'translateX(-50%)' }}>{r}</span>}
        {valid && <span className="absolute text-emerald-500 font-semibold" style={{ left: `${wRefuse + wRevue}%`, transform: 'translateX(-50%)' }}>{a}</span>}
        <span className="absolute right-0">{max}</span>
      </div>
    </div>
  );
}

// END OF FILE: components/admin/ThresholdVisualizer.tsx