import { useMemo, useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../hooks/useTheme";
import { IconButton } from "../atoms/IconButton";

function isNumericCell(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "number" && !Number.isNaN(v)) return true;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return true;
  return false;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
}

function labelKey(label: string): string {
  return label.length > 18 ? `${label.slice(0, 16)}…` : label;
}

interface ChartPanelProps {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

const COLORS = [
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#65a30d",
  "#84cc16",
  "#a3e635",
  "#0d9488",
  "#14b8a6",
  "#2dd4bf",
  "#059669",
];

type ChartType = "bar" | "line" | "pie";

export function ChartPanel({ columns, rows }: ChartPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tickFill = isDark ? "#86efac" : "#166534";
  const gridStroke = isDark ? "#14532d" : "#bbf7d0";
  const axisLine = isDark ? "#14532d" : "#bbf7d0";
  const [chartType, setChartType] = useState<ChartType>("bar");

  const data = useMemo(() => {
    if (columns.length !== 2 || rows.length === 0) return null;
    const c0 = columns[0]!;
    const c1 = columns[1]!;
    const numericCount = rows.filter((r) => isNumericCell(r[c1])).length;
    if (numericCount < rows.length * 0.8) return null;

    const withNum = rows.map((r) => ({
      name: String(r[c0] ?? ""),
      value: toNumber(r[c1]),
    }));
    const sorted = [...withNum].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 30);
    return top.map((d) => ({
      name: d.name,
      nameShort: labelKey(d.name),
      value: d.value,
    }));
  }, [columns, rows]);

  if (!data || data.length === 0) return null;

  const pieSlice = data.slice(0, 10);

  const tooltipContentStyle: CSSProperties = {
    borderRadius: 12,
    border: isDark ? "1px solid #14532d" : "1px solid #bbf7d0",
    boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
    fontSize: 12,
    background: isDark ? "#0f172a" : "#fff",
    color: isDark ? "#e2e8f0" : "#0f172a",
  };

  const pieLabelFill = isDark ? "#e2e8f0" : "#0f172a";

  const renderPieLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
    nameShort?: string;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, nameShort = "" } = props;
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const anchor = x > cx ? "start" : "end";
    return (
      <text
        x={x}
        y={y}
        fill={pieLabelFill}
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={10}
      >
        {`${nameShort} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-gradient-to-b from-brand-50/40 to-white p-3 shadow-soft dark:border-brand-900/40 dark:from-brand-950/40 dark:to-slate-900">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
          Visualização
        </p>
        <div className="flex items-center gap-0.5">
          <IconButton
            type="button"
            size="sm"
            tone="brand"
            title="Gráfico de barras"
            aria-label="Gráfico de barras"
            className={
              chartType === "bar"
                ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
                : "border-transparent"
            }
            onClick={() => setChartType("bar")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            tone="brand"
            title="Gráfico de linhas"
            aria-label="Gráfico de linhas"
            className={
              chartType === "line"
                ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
                : "border-transparent"
            }
            onClick={() => setChartType("line")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M3 3v18h18" />
              <path d="M7 12l4-4 4 4 6-6" />
            </svg>
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            tone="brand"
            title="Gráfico de pizza (até 10 itens)"
            aria-label="Gráfico de pizza"
            className={
              chartType === "pie"
                ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
                : "border-transparent"
            }
            onClick={() => setChartType("pie")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3 A9 9 0 0 1 21 12 L12 12 Z" fill="currentColor" stroke="none" />
            </svg>
          </IconButton>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" && (
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 32 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="nameShort"
                angle={-35}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10, fill: tickFill }}
                interval={0}
                axisLine={{ stroke: axisLine }}
                tickLine={{ stroke: axisLine }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={{ stroke: axisLine }}
                tickLine={{ stroke: axisLine }}
              />
              <Tooltip
                cursor={{ fill: "rgba(22, 163, 74, 0.08)" }}
                contentStyle={tooltipContentStyle}
                formatter={(value) => {
                  if (value == null) return "";
                  if (typeof value === "number")
                    return value.toLocaleString("pt-BR");
                  return String(value);
                }}
                labelFormatter={(_l, p) => {
                  const pl = p?.[0]?.payload as { name?: string } | undefined;
                  return pl?.name ?? "";
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
          {chartType === "line" && (
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 32 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="nameShort"
                angle={-35}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10, fill: tickFill }}
                interval={0}
                axisLine={{ stroke: axisLine }}
                tickLine={{ stroke: axisLine }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={{ stroke: axisLine }}
                tickLine={{ stroke: axisLine }}
              />
              <Tooltip
                cursor={{ fill: "rgba(22, 163, 74, 0.08)" }}
                contentStyle={tooltipContentStyle}
                formatter={(value) => {
                  if (value == null) return "";
                  if (typeof value === "number")
                    return value.toLocaleString("pt-BR");
                  return String(value);
                }}
                labelFormatter={(_l, p) => {
                  const pl = p?.[0]?.payload as { name?: string } | undefined;
                  return pl?.name ?? "";
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: "#16a34a", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
          {chartType === "pie" && (
            <PieChart margin={{ top: 8, right: 48, bottom: 8, left: 48 }}>
              <Pie
                data={pieSlice}
                dataKey="value"
                nameKey="nameShort"
                cx="50%"
                cy="45%"
                outerRadius={72}
                labelLine={false}
                label={renderPieLabel}
                isAnimationActive={false}
              >
                {pieSlice.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipContentStyle}
                formatter={(value) => {
                  if (value == null) return "";
                  if (typeof value === "number")
                    return value.toLocaleString("pt-BR");
                  return String(value);
                }}
                labelFormatter={(_l, p) => {
                  const pl = p?.[0]?.payload as { name?: string } | undefined;
                  return pl?.name ?? "";
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconSize={8}
                wrapperStyle={{ fontSize: 10, color: tickFill, paddingTop: 8 }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
