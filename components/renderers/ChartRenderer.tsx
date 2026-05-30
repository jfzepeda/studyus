"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartType } from "@/lib/store";

const COLORS = [
  "#818cf8",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#22d3ee",
  "#a78bfa",
  "#f87171",
  "#4ade80",
];

const axisStyle = { fontSize: 11, fill: "#94a3b8" };
const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

export function ChartRenderer({
  tipo,
  data,
}: {
  tipo: ChartType;
  data: { label: string; value: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {tipo === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : tipo === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: COLORS[0] }}
            />
          </LineChart>
        ) : (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={(entry: any) => entry.label}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
