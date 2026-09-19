import { cn } from "@/lib/utils";

export type RevueFilter = "tous" | "anomalies";

export function RevueFilterTabs({
  value,
  onChange,
  totalCount,
  anomalyCount,
}: {
  value: RevueFilter;
  onChange: (v: RevueFilter) => void;
  totalCount: number;
  anomalyCount: number;
}) {
  const tabs: { value: RevueFilter; label: string; count: number }[] = [
    { value: "tous", label: "Tous", count: totalCount },
    { value: "anomalies", label: "Anomalies", count: anomalyCount },
  ];

  return (
    <div className="flex gap-1 px-3 pt-3">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg font-label-md transition-colors",
            value === tab.value ? "bg-supervisor-violet/10 text-supervisor-violet" : "text-on-surface-variant hover:bg-surface-container-low"
          )}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
