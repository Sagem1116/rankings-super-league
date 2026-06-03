import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EvolutionData {
  epoca: string;
  pos: number;
  divisao: number;
  [key: string]: string | number;
}

interface RankingEvolutionChartProps {
  data: EvolutionData[];
  title?: string;
  showLegend?: boolean;
  seriesKey?: string;
}

export function RankingEvolutionChart({ data, title, showLegend = true, seriesKey }: RankingEvolutionChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Sem dados de evolução disponíveis
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => String(a.epoca).localeCompare(String(b.epoca)));
  const divisoes = [...new Set(sortedData.map((d) => d.divisao))].sort((a, b) => a - b);
  const colors = ["#d4a574", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#22c55e", "#38bdf8", "#f97316", "#a855f7", "#ec4899"];

  const chartData = sortedData.map((d) => ({
    ...d,
    epoca: String(d.epoca),
    pos: d.pos,
    divisao: d.divisao,
  }));

  const series = seriesKey
    ? [...new Set(sortedData.map((d) => String(d[seriesKey] ?? "")))].filter((value) => value !== "")
    : [];

  const seriesValues = series.map((value) => ({
    name: value,
    data: chartData.filter((d) => String(d[seriesKey] ?? "") === value),
  }));

  const maxPos = Math.max(...sortedData.map((d) => d.pos)) + 2;

  return (
    <div className="w-full">
      {title && <h3 className="mb-3 text-lg font-bold text-violet-200">{title}</h3>}
      <div className="rounded-lg border border-border bg-secondary/20 p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={seriesValues.length > 0 ? undefined : chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="epoca"
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "12px" }}
              domain={[1, maxPos]}
              reversed
              label={{ value: "Posição", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === "pos") return [`${value}º`, "Posição"];
                if (name === "divisao") return [`Div ${value}`, "Divisão"];
                return [value, name];
              }}
              labelFormatter={(label) => `Época: ${label}`}
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(212, 165, 116, 0.5)",
                borderRadius: "4px",
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
              />
            )}
            {seriesValues.length > 0 ? (
              seriesValues.map((serie, index) => (
                <Line
                  key={serie.name}
                  data={serie.data}
                  type="monotone"
                  dataKey="pos"
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={serie.name}
                  isAnimationActive={true}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="pos"
                stroke={colors[0]}
                strokeWidth={2.5}
                dot={{ fill: colors[0], r: 5 }}
                activeDot={{ r: 7 }}
                name="Posição"
                isAnimationActive={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {divisoes.length > 1 && (
        <div className="mt-3 text-xs text-muted-foreground">
          <p>
            Nota: Dados incluem divisões {divisoes.map((d) => `Div ${d}`).join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}
