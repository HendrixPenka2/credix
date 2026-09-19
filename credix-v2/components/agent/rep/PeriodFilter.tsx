import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "all", label: "Tout" },
] as const;

export type ReportPeriode = "7j" | "30j" | "90j" | "all";

export function PeriodFilter({ value, onChange }: { value: ReportPeriode; onChange: (v: ReportPeriode) => void }) {
  return (
    <div className="inline-flex bg-surface-container-lowest rounded-lg border border-outline-variant p-1 shadow-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-4 py-1.5 font-data-sm rounded-md transition-colors",
            value === opt.value ? "bg-surface-container-high text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
