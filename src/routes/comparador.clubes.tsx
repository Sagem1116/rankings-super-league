import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ResponsiveContainer, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Legend, Tooltip } from "recharts";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/comparador/clubes")({
  head: () => ({
    meta: [
      { title: "Comparador de Clubes — FMDataLab" },
      { name: "description", content: "Comparação multi-clube com radar charts." },
    ],
  }),
  component: ComparadorPage,
});

const COLORS = ["#a78bfa", "#f0abfc", "#5eead4", "#fbbf24"];

function tokens(inf: string) {
  return new Set(String(inf || "").toUpperCase().split(/[\s,;/|+]+/).filter(Boolean));
}

interface ClubeMetrics { ataque: number; defesa: number; pontos: number; titulos: number; promos: number; financas: number; }

function ComparadorPage() {
  const { seasons } = useFMStore();

  const clubes = useMemo(() => {
    const set = new Set<string>();
    seasons.forEach((s) => s.rankings.forEach((r) => set.add(r.Equipa)));
    return [...set].sort();
  }, [seasons]);

  const [selected, setSelected] = useState<string[]>([]);

  const metricsByClube = useMemo(() => {
    const out = new Map<string, ClubeMetrics>();
    clubes.forEach((c) => {
      let gm = 0, gs = 0, pts = 0, titulos = 0, promos = 0, vp = 0;
      seasons.forEach((s) => {
        const r = s.rankings.find((x) => x.Equipa === c);
        if (r) {
          gm += r.GM; gs += r.GS; pts += r.Pts;
          const tk = tokens(r.Inf);
          if (tk.has("C")) titulos++;
          if (tk.has("P")) promos++;
        }
      });
      const last = seasons[seasons.length - 1];
      if (last) {
        vp = last.jogadores.filter((j) => j.Clube === c).reduce((acc, j) => acc + (j.VP || 0), 0);
      }
      out.set(c, { ataque: gm, defesa: gs, pontos: pts, titulos, promos, financas: vp });
    });
    return out;
  }, [clubes, seasons]);

  // Max values across all clubs for normalization
  const maxes = useMemo(() => {
    let mAt = 1, mDef = 1, mPts = 1, mTit = 1, mPro = 1, mFin = 1;
    metricsByClube.forEach((m) => {
      mAt = Math.max(mAt, m.ataque);
      mDef = Math.max(mDef, m.defesa);
      mPts = Math.max(mPts, m.pontos);
      mTit = Math.max(mTit, m.titulos);
      mPro = Math.max(mPro, m.promos);
      mFin = Math.max(mFin, m.financas);
    });
    return { mAt, mDef, mPts, mTit, mPro, mFin };
  }, [metricsByClube]);

  const radarData = useMemo(() => {
    const axes = ["Ataque", "Defesa", "Pontos", "Títulos", "Promoções", "Finanças"] as const;
    return axes.map((axis) => {
      const row: Record<string, number | string> = { axis };
      selected.forEach((c) => {
        const m = metricsByClube.get(c);
        if (!m) { row[c] = 0; return; }
        let v = 0;
        if (axis === "Ataque") v = (m.ataque / maxes.mAt) * 100;
        else if (axis === "Defesa") v = (1 - m.defesa / maxes.mDef) * 100; // less goals conceded = better
        else if (axis === "Pontos") v = (m.pontos / maxes.mPts) * 100;
        else if (axis === "Títulos") v = (m.titulos / maxes.mTit) * 100;
        else if (axis === "Promoções") v = (m.promos / maxes.mPro) * 100;
        else if (axis === "Finanças") v = (m.financas / maxes.mFin) * 100;
        row[c] = Math.round(v);
      });
      return row;
    });
  }, [selected, metricsByClube, maxes]);

  function toggle(c: string) {
    setSelected((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : prev.length >= 4 ? prev : [...prev, c]);
  }

  if (!seasons.length) {
    return (
      <div className="rounded-[2rem] glow-panel p-10 text-center">
        <p className="text-slate-300">Carrega um dataset para usar o comparador.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/30">Ir para upload</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] glow-panel p-6">
        <h1 className="text-2xl font-bold text-white glow-heading">Comparador de Clubes</h1>
        <p className="mt-1 text-sm text-slate-400">Selecciona até 4 clubes. Valores normalizados (0-100) face ao máximo do dataset. Defesa = inverso de golos sofridos.</p>
      </header>

      <div className="rounded-[1.75rem] glow-panel p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-violet-300">Clubes seleccionados ({selected.length}/4)</p>
        <div className="flex flex-wrap gap-2">
          {selected.map((c, i) => (
            <button key={c} onClick={() => toggle(c)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: COLORS[i] + "33", border: `1px solid ${COLORS[i]}` }}>
              {c} ✕
            </button>
          ))}
        </div>
        <select onChange={(e) => { if (e.target.value) toggle(e.target.value); e.target.value = ""; }} className="mt-4 w-full max-w-md rounded-lg border border-white/10 bg-[#0d1222] px-3 py-2 text-sm text-white">
          <option value="">+ Adicionar clube...</option>
          {clubes.filter((c) => !selected.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {selected.length >= 2 && (
        <div className="rounded-[1.75rem] glow-panel p-6">
          <div className="h-[500px] w-full">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(167,139,250,0.2)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#e2e8f0", fontSize: 13 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                {selected.map((c, i) => (
                  <Radar key={c} name={c} dataKey={c} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.25} />
                ))}
                <Legend />
                <Tooltip contentStyle={{ background: "#0d1222", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selected.length >= 2 && (
        <div className="overflow-hidden rounded-[1.75rem] glow-panel">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-slate-950/90 text-xs uppercase tracking-[0.16em] text-violet-300">
              <tr>
                <th className="px-4 py-2 text-left">Clube</th>
                <th className="px-4 py-2 text-right">GM</th>
                <th className="px-4 py-2 text-right">GS</th>
                <th className="px-4 py-2 text-right">Pts</th>
                <th className="px-4 py-2 text-right">Títulos</th>
                <th className="px-4 py-2 text-right">Promos</th>
                <th className="px-4 py-2 text-right">VP (atual)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/60 text-slate-200">
              {selected.map((c) => {
                const m = metricsByClube.get(c)!;
                return (
                  <tr key={c}>
                    <td className="px-4 py-2 font-medium">{c}</td>
                    <td className="px-4 py-2 text-right">{m.ataque}</td>
                    <td className="px-4 py-2 text-right">{m.defesa}</td>
                    <td className="px-4 py-2 text-right">{m.pontos}</td>
                    <td className="px-4 py-2 text-right text-violet-200">{m.titulos}</td>
                    <td className="px-4 py-2 text-right">{m.promos}</td>
                    <td className="px-4 py-2 text-right">{Math.round(m.financas).toLocaleString("pt-PT")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
