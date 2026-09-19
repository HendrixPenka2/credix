import { Card, CardTitle } from "@/components/ui/card";

export function FluxBPercentileReadOnlyCard({ percentile }: { percentile: 95 | 99 }) {
  return (
    <Card className="p-card-padding">
      <div className="flex items-center justify-between mb-3">
        <CardTitle>Sensibilité de détection (Flux B)</CardTitle>
        <span className="font-label-md text-on-surface-variant uppercase">Non modifiable</span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2">
        <span className="flex items-center gap-2 font-body-sm text-on-surface">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Percentile de référence
        </span>
        <span className="font-mono text-on-surface-variant">P{percentile}</span>
      </div>
      <p className="font-body-sm text-on-surface-variant mt-3">
        Dérivé de la population d&apos;apprentissage de l&apos;autoencodeur, ce seuil suit le cycle de vie des artefacts et n&apos;est pas
        réglable indépendamment d&apos;eux.
      </p>
    </Card>
  );
}
