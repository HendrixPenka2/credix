import { InfoCallout } from "@/components/shared/InfoCallout";

export function ActiveRuleCard({ refuse, accorde }: { refuse: number; accorde: number }) {
  return (
    <InfoCallout icon="rule" title="Règle active">
      <p>
        Tout dossier avec un score inférieur à <span className="bg-slate-800 px-1 rounded font-mono">{Math.round(refuse)}</span> est{" "}
        <span className="text-danger-rose font-semibold">refusé</span> automatiquement.
      </p>
      <p>
        Entre <span className="bg-slate-800 px-1 rounded font-mono">{Math.round(refuse)}</span> et{" "}
        <span className="bg-slate-800 px-1 rounded font-mono">{Math.round(accorde)}</span>, le dossier passe en{" "}
        <span className="text-warning-amber font-semibold">revue manuelle</span>.
      </p>
      <p>
        Au-dessus de <span className="bg-slate-800 px-1 rounded font-mono">{Math.round(accorde)}</span>, le dossier est{" "}
        <span className="text-success-emerald font-semibold">pré-approuvé</span> automatiquement.
      </p>
    </InfoCallout>
  );
}
