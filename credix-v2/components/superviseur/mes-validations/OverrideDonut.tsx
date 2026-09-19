"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import type { OverrideStats } from "@/lib/types";

/** Donut accordé/refusé — référence : mes_validations_superviseur_credix (conic-gradient CSS → remplacé par un vrai donut Recharts). */
export function OverrideDonut({ stats }: { stats: OverrideStats }) {
  const data = [
    { name: "Accordé", value: stats.overrides_accordes, color: "#10b981" },
    { name: "Refusé", value: stats.overrides_refuses, color: "#f43f5e" },
  ];
  const total = stats.overrides_accordes + stats.overrides_refuses;

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-4">Répartition de mes décisions</CardTitle>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="65%" outerRadius="100%" paddingAngle={2} startAngle={90} endAngle={-270}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-data-lg text-on-surface">{total}</span>
          <span className="font-label-md text-on-surface-variant">Total</span>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 font-body-sm text-on-surface-variant">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.name} {total > 0 ? Math.round((d.value / total) * 100) : 0}%
          </span>
        ))}
      </div>
    </Card>
  );
}
