import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "7j", label: "7J" },
  { value: "30j", label: "30J" },
  { value: "90j", label: "90J" },
] as const;

export type Periode = "7j" | "30j" | "90j";

export function PeriodSelector({ value, onChange }: { value: Periode; onChange: (v: Periode) => void }) {
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
