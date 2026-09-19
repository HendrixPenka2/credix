import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface ClientFilters {
  rhoTier: "all" | "critique" | "partielle" | "suffisante";
  decision: "all" | "ACCORDE" | "REFUSE" | "REVUE_MANUELLE";
}

const RHO_OPTIONS = [
  { value: "all", label: "Toutes couvertures" },
  { value: "critique", label: "Critique (<25%)" },
  { value: "partielle", label: "Partielle (25-40%)" },
  { value: "suffisante", label: "Suffisante (≥40%)" },
];

const DECISION_OPTIONS = [
  { value: "all", label: "Toutes décisions" },
  { value: "ACCORDE", label: "Accordé" },
  { value: "REFUSE", label: "Refusé" },
  { value: "REVUE_MANUELLE", label: "En revue" },
];

export function FiltersBar({ filters, onChange }: { filters: ClientFilters; onChange: (f: ClientFilters) => void }) {
  return (
    <div className="flex gap-3">
      <Select value={filters.rhoTier} onValueChange={(v) => onChange({ ...filters, rhoTier: v as ClientFilters["rhoTier"] })}>
        <SelectTrigger className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RHO_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.decision} onValueChange={(v) => onChange({ ...filters, decision: v as ClientFilters["decision"] })}>
        <SelectTrigger className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DECISION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
