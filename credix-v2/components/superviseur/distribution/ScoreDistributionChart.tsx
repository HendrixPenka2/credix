"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ScoreDistribution } from "@/lib/types";

export interface ScoreDistributionChartProps {
  distribution: ScoreDistribution;
  seuilRefuse: number;
  seuilAccorde: number;
}

function zoneColor(bucket: number | string, seuilRefuse: number, seuilAccorde: number): string {
  if (typeof bucket !== "number") return "#76777d";
  if (bucket < seuilRefuse) return "#f43f5e";
  if (bucket < seuilAccorde) return "#f59e0b";
  return "#10b981";
}

/** Histogramme des scores avec les seuils PDO réellement actifs (score-bands), pas des valeurs par défaut. */
export function ScoreDistributionChart({ distribution, seuilRefuse, seuilAccorde }: ScoreDistributionChartProps) {
  const data = distribution.distribution.map((d) => ({ bucket: d._id, count: d.count, label: typeof d._id === "number" ? `${d._id}` : d._id }));
  // Les buckets sont par pas de 50 (300, 350, ...) — les seuils réels (ex: 539.5) ne
  // tombent jamais exactement sur un bucket, donc une ReferenceLine catégorielle ne
  // s'affiche que si on l'aligne sur le bucket le plus proche.
  const nearestBucket = (seuil: number) => String(Math.round(seuil / 50) * 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des scores du portefeuille</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={{ stroke: "var(--outline-variant)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value} dossiers`, "Total"]}
            />
            <ReferenceLine x={nearestBucket(seuilRefuse)} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: "Refus", fontSize: 10, fill: "#f43f5e" }} />
            <ReferenceLine x={nearestBucket(seuilAccorde)} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Accord", fontSize: 10, fill: "#10b981" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={zoneColor(entry.bucket, seuilRefuse, seuilAccorde)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
