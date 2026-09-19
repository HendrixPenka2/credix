"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonChart } from "@/components/ui/skeleton";
import type { ScoreDistribution } from "@/lib/types";
import { DEFAULT_PDO_SEUIL_REFUSE, DEFAULT_PDO_SEUIL_ACCORDE } from "@/lib/design-tokens";

function zoneColor(bucket: number | string): string {
  if (typeof bucket !== "number") return "#76777d";
  if (bucket < DEFAULT_PDO_SEUIL_REFUSE) return "#f43f5e";
  if (bucket < DEFAULT_PDO_SEUIL_ACCORDE) return "#f59e0b";
  return "#10b981";
}

export function ScoreHistogram({ distribution, loading }: { distribution: ScoreDistribution | null; loading: boolean }) {
  if (loading || !distribution) {
    return (
      <Card className="p-card-padding">
        <SkeletonChart />
      </Card>
    );
  }

  const data = distribution.distribution.map((d) => ({ bucket: d._id, count: d.count, label: typeof d._id === "number" ? `${d._id}` : d._id }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des scores (PDO)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={{ stroke: "var(--outline-variant)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value} dossiers`, "Total"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={zoneColor(entry.bucket)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
