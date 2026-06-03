import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/page-header";
import { PAGES } from "@/lib/page-registry";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/scouting")({ component: ScoutingPage });

function tier(r: number) {
  if (r >= 85) return { label: "World Class", color: "#facc15" };
  if (r >= 70) return { label: "Elite", color: "#fb923c" };
  if (r >= 55) return { label: "Muito Forte", color: "#f97316" };
  if (r >= 40) return { label: "Competitivo", color: "#ea580c" };
  return { label: "Médio", color: "#9ca3af" };
}

function ScoutingPage() {
  const { resultados } = useFMStore();
  const tableKeys = useMemo(
    () => Object.values(resultados).filter((t) => t.entityKey && t.epochKeys?.length).map((t) => t.key),
    [resultados],
  );
  const [tableKey, setTableKey] = useState<string>(tableKeys[0] ?? "Pontos_Totais");
  const table = resultados[tableKey];
  const [search, setSearch] = useState("");
  const [compareList, setCompareList] = useState<string>("");

  const entityKey = table?.entityKey ?? "Equipa";
  const epochs = table?.epochKeys ?? [];

  const suggestions = useMemo(() => {
    if (!table || !search.trim()) return [];
    const q = search.toLowerCase();
    return table.rows.map((r) => String(r[entityKey] ?? "")).filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [search, table, entityKey]);

  const profile = useMemo(() => {
    if (!table || !search) return null;
    const row = table.rows.find((r) => String(r[entityKey]) === search);
    if (!row) return null;
    const vals = epochs.map((e) => Number(row[e]) || 0);
    // rank position per epoch (1 = best). Higher value = better rank.
    const positions = epochs.map((e) => {
      const all = table.rows
        .map((r) => ({ name: String(r[entityKey]), v: Number(r[e]) || 0 }))
        .filter((x) => Number.isFinite(x.v));
      all.sort((a, b) => b.v - a.v);
      const idx = all.findIndex((x) => x.name === search);
      return idx === -1 ? null : idx + 1;
    });
    const media = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const last3 = vals.slice(-3);
    const forma = last3.reduce((a, b) => a + b, 0) / Math.max(1, last3.length);
    const consistencia = 1 / (1 + stdev(vals));
    const max = Math.max(...vals, 1);
    const rating = Math.min(100, ((media / max) * 0.45 + (forma / max) * 0.35 + consistencia * 0.20) * 100);
    const validPos = positions.filter((p): p is number => p !== null);
    const melhorPos = validPos.length ? Math.min(...validPos) : null;
    const piorPos = validPos.length ? Math.max(...validPos) : null;
    const mediaPos = validPos.length ? validPos.reduce((a, b) => a + b, 0) / validPos.length : null;
    return { row, vals, positions, media, forma, consistencia, rating,
      melhor: Math.max(...vals), pior: Math.min(...vals),
      melhorPos, piorPos, mediaPos };
  }, [search, table, entityKey, epochs]);

  const compareEntities = compareList.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const compareData = useMemo(() => {
    if (!table) return [];
    return epochs.map((e) => {
      const point: any = { epoca: e };
      for (const name of compareEntities) {
        const row = table.rows.find((r) => String(r[entityKey]) === name);
        if (row) point[name] = Number(row[e]) || 0;
      }
      return point;
    });
  }, [compareEntities, table, entityKey, epochs]);

  const t = profile ? tier(profile.rating) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Scouting" description="Perfil individual e comparador multi-entidade." />
      <div className="rounded-[2rem] glow-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-200">Ranking:</label>
          <select value={tableKey} onChange={(e) => setTableKey(e.target.value)}
            className="rounded border border-white/10 bg-[#08101e] px-2 py-1 text-sm text-slate-200">
            {tableKeys.map((k) => (
              <option key={k} value={k}>{PAGES.find((p) => p.key === k)?.title ?? k}</option>
            ))}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} list="ent-list"
            placeholder="Pesquisar entidade…"
            className="flex-1 min-w-[200px] rounded border border-white/10 bg-[#08101e] px-3 py-1 text-sm text-slate-200" />
          <datalist id="ent-list">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      {profile && t && (
        <div className="rounded-[2rem] glow-panel p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-violet-200">{search}</h3>
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-100">{t.label}</span>
            <div className="ml-auto flex w-64 flex-col">
              <span className="text-xs text-slate-400">Rating: {profile.rating.toFixed(1)}</span>
              <div className="h-2 w-full overflow-hidden rounded bg-[#111827]">
                <div className="h-full bg-violet-500" style={{ width: `${profile.rating}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Média" value={profile.media.toFixed(2)} />
            <Kpi label="Melhor" value={profile.melhor.toFixed(0)} />
            <Kpi label="Pior" value={profile.pior.toFixed(0)} />
            <Kpi label="Consistência" value={profile.consistencia.toFixed(3)} />
            <Kpi label="Melhor Posição" value={profile.melhorPos ? `#${profile.melhorPos}` : "—"} />
            <Kpi label="Pior Posição" value={profile.piorPos ? `#${profile.piorPos}` : "—"} />
            <Kpi label="Posição Média" value={profile.mediaPos ? profile.mediaPos.toFixed(1) : "—"} />
          </div>
          <div className="h-64">
            <div className="mb-1 text-xs text-slate-400">Valor por época</div>
            <ResponsiveContainer><LineChart data={epochs.map((e, i) => ({ epoca: e, valor: profile.vals[i] }))}>
              <CartesianGrid stroke="#333" />
              <XAxis dataKey="epoca" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </div>
          <div className="h-64">
            <div className="mb-1 text-xs text-slate-400">Posição no ranking por época (1 = melhor)</div>
            <ResponsiveContainer><LineChart data={epochs.map((e, i) => ({ epoca: e, posicao: profile.positions[i] }))}>
              <CartesianGrid stroke="#333" />
              <XAxis dataKey="epoca" stroke="#aaa" />
              <YAxis stroke="#aaa" reversed allowDecimals={false} domain={[1, "dataMax"]} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
                formatter={(v: any) => (v ? `#${v}` : "—")} />
              <Line type="monotone" dataKey="posicao" stroke="#a78bfa" strokeWidth={2} connectNulls />
            </LineChart></ResponsiveContainer>
          </div>
          <div className="overflow-x-auto rounded border border-white/10 bg-[#0b1228]/90">
            <table className="w-full text-xs">
              <thead className="bg-[#111827] text-violet-200">
                <tr>
                  <th className="px-2 py-1 text-left">Época</th>
                  {epochs.map((e) => <th key={e} className="px-2 py-1 text-right">{e}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#0a1223]">
                  <td className="px-2 py-1 font-semibold text-slate-200">Valor</td>
                  {profile.vals.map((v, i) => <td key={i} className="px-2 py-1 text-right text-slate-200">{v.toFixed(2)}</td>)}
                </tr>
                <tr className="bg-[#0f172a]/70">
                  <td className="px-2 py-1 font-semibold text-slate-200">Posição</td>
                  {profile.positions.map((p, i) => <td key={i} className="px-2 py-1 text-right text-slate-200">{p ? `#${p}` : "—"}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Comparador Multi (até 5)</h3>
        <input value={compareList} onChange={(e) => setCompareList(e.target.value)}
          placeholder="Nomes separados por vírgula"
          className="w-full rounded border border-white/10 bg-[#08101e] px-3 py-1 text-sm text-slate-200" />
        {compareEntities.length > 0 && (
          <div className="mt-3 h-72">
            <ResponsiveContainer><LineChart data={compareData}>
              <CartesianGrid stroke="#333" />
              <XAxis dataKey="epoca" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
              <Legend />
              {compareEntities.map((n, i) => (
                <Line key={n} type="monotone" dataKey={n} stroke={["#8b5cf6","#7c3aed","#6366f1","#4f46e5","#a78bfa"][i]} strokeWidth={2} />
              ))}
            </LineChart></ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-500/10 bg-[#0a1224]/90 p-3 shadow-[0_24px_80px_-50px_rgba(167,139,250,0.16)]">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold text-violet-200">{value}</div>
    </div>
  );
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
