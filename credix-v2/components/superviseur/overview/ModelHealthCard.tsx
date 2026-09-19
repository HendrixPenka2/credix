import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { getPsiStyle } from "@/lib/design-tokens";
import type { ModelDrift, ModelVersion } from "@/lib/types";

export function ModelHealthCard({ drift, production }: { drift: ModelDrift; production?: ModelVersion }) {
  const psiStyle = drift.psi != null ? getPsiStyle(drift.statut) : null;
  const psiPct = drift.psi != null ? Math.min(100, (drift.psi / 0.4) * 100) : 0;

  return (
    <Link
      href="/superviseur/modele/derive"
      className="block rounded-xl bg-slate-900 text-white p-card-padding relative overflow-hidden hover:opacity-95 transition-opacity"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-supervisor-violet/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="font-headline-sm">Santé du modèle IA</p>
          {psiStyle && <Badge tone={psiStyle.tone}>{psiStyle.label}</Badge>}
        </div>

        {drift.psi != null ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg">{drift.psi.toFixed(3)}</span>
              <span className="font-label-md text-slate-400">PSI</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 mt-3 overflow-hidden">
              <div className={psiStyle?.dot} style={{ width: `${psiPct}%`, height: "100%" }} />
            </div>
          </>
        ) : (
          <p className="font-body-sm text-slate-400">{drift.message}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="font-label-md text-slate-400 uppercase tracking-wider">AUC</p>
            <p className="font-data-lg mt-1">{production?.metriques?.auc?.toFixed(3) ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="font-label-md text-slate-400 uppercase tracking-wider">Gini</p>
            <p className="font-data-lg mt-1">{production?.metriques?.gini?.toFixed(3) ?? "—"}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 font-body-sm text-slate-400 mt-3">
          Voir le détail de la dérive
          <Icon name="arrow_forward" size={14} />
        </span>
      </div>
    </Link>
  );
}
