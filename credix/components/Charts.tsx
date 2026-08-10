import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

// ─── ScoreGauge (inchangé) ────────────────────────────────────────────────────

export function ScoreGauge({ score }: { score: number }) {
  const min = 300, max = 850;
  const safeScore  = Math.min(Math.max(score, min), max);
  const percentage = (safeScore - min) / (max - min);

  let color = '#DC2626';
  if (safeScore >= 500 && safeScore < 600) color = '#D97706';
  if (safeScore >= 600) color = '#16A34A';

  const data = [
    { name: 'score',     value: percentage },
    { name: 'remainder', value: 1 - percentage },
  ];

  return (
    <div className="relative w-full h-48 flex items-end justify-center overflow-hidden">
      <div className="absolute inset-0 top-4">
        <ResponsiveContainer width="100%" height="200%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" startAngle={180} endAngle={0}
              innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value"
              stroke="none" isAnimationActive={true}>
              <Cell key="cell-0" fill={color} />
              <Cell key="cell-1" fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute w-full h-full pb-4 px-8 flex justify-between items-end">
        <div className="text-xs text-gray-400 font-mono">300</div>
        <div className="text-xs text-gray-400 font-mono">850</div>
      </div>
      <div className="z-10 flex flex-col items-center justify-end pb-2">
        <span className="text-5xl font-extrabold tracking-tighter" style={{ color }}>{safeScore}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider mt-1 font-semibold">Score PDO</span>
      </div>
    </div>
  );
}

// ─── CoverageRing (inchangé) ──────────────────────────────────────────────────

export function CoverageRing({ rho }: { rho: number }) {
  const percentage = Math.min(Math.max(rho * 100, 0), 100);

  let color = '#DC2626';
  if (percentage >= 25 && percentage < 40) color = '#D97706';
  if (percentage >= 40) color = '#16A34A';

  const data = [
    { name: 'coverage',  value: percentage },
    { name: 'remainder', value: 100 - percentage },
  ];

  return (
    <div className="relative w-24 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius="75%" outerRadius="100%"
            startAngle={90} endAngle={-270} dataKey="value" stroke="none">
            <Cell fill={color} />
            <Cell fill="#E5E7EB" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

// ─── ShapBar (redesigné) ──────────────────────────────────────────────────────
//
// Design :
//   ↑  Label feature          ████████████░░░░░░  +34%
//      Explication naturelle
//
// Rouge  = aggravant  (shap_value > 0, augmente le risque)
// Vert   = atténuant  (shap_value < 0, réduit le risque)
// La barre représente le poids relatif du facteur (poids_pct ou shap absolu).

/** Supprime les balises markdown **bold** de l'explication naturelle */
function stripMarkdown(text: string): string {
  return text?.replace(/\*\*(.*?)\*\*/g, '$1') ?? '';
}

export function ShapBar({
  label,
  shap_value,
  poids_pct,
  explication_naturelle,
}: {
  label: string;
  shap_value: number;
  poids_pct?: number | null;
  explication_naturelle?: string;
}) {
  const isAggravant = shap_value > 0;

  // Largeur de la barre : poids_pct si disponible, sinon valeur absolue SHAP normalisée
  const barWidth = poids_pct != null
    ? Math.min(Math.abs(poids_pct), 100)
    : Math.min(Math.abs(shap_value) * 200, 100);

  // Valeur affichée à droite
  const displayValue = poids_pct != null
    ? `${isAggravant ? '+' : '-'}${Math.abs(poids_pct).toFixed(1)}%`
    : `${shap_value > 0 ? '+' : ''}${shap_value.toFixed(3)}`;

  // Couleurs selon direction
  const barColor  = isAggravant
    ? 'bg-rose-500 dark:bg-rose-400'
    : 'bg-emerald-500 dark:bg-emerald-400';
  const tagColor  = isAggravant
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  const arrowIcon = isAggravant ? '↑' : '↓';

  return (
    <div className="space-y-1.5 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">

      {/* Ligne principale : flèche + label + barre + valeur */}
      <div className="flex items-center gap-3">

        {/* Flèche directionnelle */}
        <span className={`text-sm font-bold w-4 shrink-0 ${isAggravant ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
          {arrowIcon}
        </span>

        {/* Label */}
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 w-48 shrink-0 truncate" title={label}>
          {label}
        </span>

        {/* Barre de progression */}
        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(barWidth, 2)}%` }}
          />
        </div>

        {/* Valeur + chip direction */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 w-14 text-right">
            {displayValue}
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${tagColor}`}>
            {isAggravant ? 'Aggravant' : 'Atténuant'}
          </span>
        </div>
      </div>

      {/* Explication naturelle */}
      {explication_naturelle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 leading-relaxed">
          {stripMarkdown(explication_naturelle)}
        </p>
      )}
    </div>
  );
}