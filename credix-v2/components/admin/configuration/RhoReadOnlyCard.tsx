import { Card, CardTitle } from "@/components/ui/card";

export function RhoReadOnlyCard({ critique, banniere }: { critique: number; banniere: number }) {
  const rows = [
    { label: "Critique", value: `< ${Math.round(critique * 100)}%`, tone: "bg-danger-rose" },
    { label: "Partielle", value: `${Math.round(critique * 100)}% – ${Math.round(banniere * 100)}%`, tone: "bg-warning-amber" },
    { label: "Suffisante", value: `≥ ${Math.round(banniere * 100)}%`, tone: "bg-success-emerald" },
  ];

  return (
    <Card className="p-card-padding">
      <div className="flex items-center justify-between mb-3">
        <CardTitle>Seuils de couverture (ρc)</CardTitle>
        <span className="font-label-md text-on-surface-variant uppercase">Non modifiables</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2">
            <span className="flex items-center gap-2 font-body-sm text-on-surface">
              <span className={`h-2 w-2 rounded-full ${r.tone}`} />
              {r.label}
            </span>
            <span className="font-mono text-on-surface-variant">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="font-body-sm text-on-surface-variant mt-3">Ces seuils sont fixés au niveau de la configuration serveur.</p>
    </Card>
  );
}
