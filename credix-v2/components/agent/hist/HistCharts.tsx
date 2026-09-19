"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DEFAULT_PDO_SEUIL_ACCORDE, DEFAULT_RHO_SEUIL_SUFFISANTE } from "@/lib/design-tokens";
import { formatDate } from "@/lib/utils";
import type { ScoringHistoryItem } from "@/lib/types";

export function HistCharts({ historique }: { historique: ScoringHistoryItem[] }) {
  const chronological = [...historique].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const data = chronological.map((h) => ({
    date: formatDate(h.timestamp),
    score: h.score_pdo,
    rho: Math.round(h.rho_c * 100),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Évolution du score</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={{ stroke: "var(--outline-variant)" }} />
              <YAxis domain={[300, 850]} tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={DEFAULT_PDO_SEUIL_ACCORDE} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Seuil accord", fontSize: 10, fill: "#10b981", position: "insideTopLeft" }} />
              <Line type="monotone" dataKey="score" stroke="var(--on-surface)" strokeWidth={2} dot={{ r: 3 }} name="Score PDO" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Évolution de la couverture (ρc)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={{ stroke: "var(--outline-variant)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface-container-lowest)", border: "1px solid var(--outline-variant)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "ρc"]} />
              <ReferenceLine y={DEFAULT_RHO_SEUIL_SUFFISANTE * 100} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Seuil min.", fontSize: 10, fill: "#f59e0b", position: "insideTopLeft" }} />
              <Line type="monotone" dataKey="rho" stroke="var(--outline)" strokeDasharray="4 2" strokeWidth={2} dot={{ r: 3 }} name="Couverture ρc" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
