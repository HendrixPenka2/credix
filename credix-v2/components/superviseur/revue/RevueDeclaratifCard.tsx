import { Card, CardTitle } from "@/components/ui/card";

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RevueDeclaratifCard({ declaratif }: { declaratif?: Record<string, any> }) {
  if (!declaratif || Object.keys(declaratif).length === 0) return null;

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-3">Données de la demande</CardTitle>
      <dl className="grid grid-cols-2 gap-3 font-body-sm">
        {Object.entries(declaratif).map(([key, value]) => (
          <div key={key}>
            <dt className="text-on-surface-variant">{humanize(key)}</dt>
            <dd className="text-on-surface font-medium font-mono">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
