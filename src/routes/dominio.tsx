import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/dominio")({
  head: () => ({
    meta: [
      { title: "Domínio por Década — FMDataLab" },
      { name: "description", content: "Quem dominou cada janela de N épocas." },
    ],
  }),
  component: DominioPage,
});

function tokens(inf: string) {
  return new Set(String(inf || "").toUpperCase().split(/[\s,;/|+]+/).filter(Boolean));
}

function DominioPage() {
  const { seasons } = useFMStore();
  const [windowSize, setWindowSize] = useState(10);

  const windows = useMemo(() => {
    if (!seasons.length) return [];
    const sorted = [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
    const eps = sorted.map((s) => s.epoca);
    const out: Array<{ label: string; entries: Array<{ clube: string; pts: number; titulos: number; promos: number }> }> = [];
    for (let i = 0; i < eps.length; i += windowSize) {
      const slice = sorted.slice(i, i + windowSize);
      const agg = new Map<string, { pts: number; titulos: number; promos: number }>();
      slice.forEach((s) => {
        s.rankings.forEach((r) => {
          const cur = agg.get(r.Equipa) ?? { pts: 0, titulos: 0, promos: 0 };
          cur.pts += r.Pts;
          const tk = tokens(r.Inf);
          if (tk.has("C")) cur.titulos++;
          if (tk.has("P")) cur.promos++;
          agg.set(r.Equipa, cur);
        });
      });
      const entries = [...agg.entries()]
        .map(([clube, v]) => ({ clube, ...v }))
        .sort((a, b) => b.titulos - a.titulos || b.pts - a.pts)
        .slice(0, 10);
      out.push({ label: `${slice[0].epoca} → ${slice[slice.length - 1].epoca}`, entries });
    }
    return out;
  }, [seasons, windowSize]);

  if (!seasons.length) {
    return (
      <div className="rounded-[2rem] glow-panel p-10 text-center">
        <p className="text-slate-300">Carrega um dataset para ver o domínio por década.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/30">Ir para upload</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] glow-panel p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white glow-heading">Domínio por Década</h1>
          <p className="mt-1 text-sm text-slate-400">Quem dominou cada janela de N épocas — ordenado por títulos e depois pontos.</p>
        </div>
        <label className="text-sm text-slate-300">
          Janela (épocas):
          <input type="number" min={2} max={50} value={windowSize}
            onChange={(e) => setWindowSize(Math.max(2, Math.min(50, +e.target.value || 10)))}
            className="ml-2 w-20 rounded-lg border border-white/10 bg-[#0d1222] px-2 py-1 text-white" />
        </label>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {windows.map((w) => (
          <div key={w.label} className="overflow-hidden rounded-[1.75rem] glow-panel">
            <div className="border-b border-white/10 px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">{w.label}</h3>
            </div>
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-[0.16em] text-violet-300">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Clube</th>
                  <th className="px-4 py-2 text-right">Títulos</th>
                  <th className="px-4 py-2 text-right">Promos</th>
                  <th className="px-4 py-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/60 text-slate-200">
                {w.entries.map((e, i) => (
                  <tr key={e.clube}>
                    <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{e.clube}</td>
                    <td className="px-4 py-2 text-right text-violet-200">{e.titulos}</td>
                    <td className="px-4 py-2 text-right">{e.promos}</td>
                    <td className="px-4 py-2 text-right">{e.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
