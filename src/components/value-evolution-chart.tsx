import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function ValueEvolutionChart({
  data,
  title,
  valueLabel = "Valor",
}: {
  data: Array<{ epoca: string; value: number; pos?: number | undefined }>;
  title: string;
  valueLabel?: string;
}) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Sem dados de coeficiente disponíveis.
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-bold text-violet-200">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
            <XAxis dataKey="epoca" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 12 }}
              label={{ value: valueLabel, angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", dy: -6 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                const payload = props?.payload as { pos?: number } | undefined;
                const formatted = Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 2 });
                if (payload?.pos !== undefined) {
                  return [`${formatted} (#${payload.pos})`, valueLabel];
                }
                return [formatted, valueLabel];
              }}
              labelFormatter={(label) => `Época: ${label}`}
            />
            <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
