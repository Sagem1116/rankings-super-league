import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/h2h")({
  head: () => ({
    meta: [
      { title: "Head-to-Head Histórico — FMDataLab" },
      { name: "description", content: "Compara dois clubes época a época." },
    ],
  }),
  component: H2HPage,
});

function H2HPage() {
  const { seasons } = useFMStore();
  const clubes = useMemo(() => {
    const set = new Set<string>();
    seasons.forEach((s) => s.rankings.forEach((r) => set.add(r.Equipa)));
    return [...set].sort();
  }, [seasons]);

  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const rows = useMemo(() => {
    if (!a || !b) return [];
    const sorted = [...seasons].sort((x, y) => x.epoca.localeCompare(y.epoca));
    return sorted
      .map((s) => {
        const ra = s.rankings.find((r) => r.Equipa === a);
        const rb = s.rankings.find((r) => r.Equipa === b);
        if (!ra || !rb) return null;
        const sameDiv = ra.Divisao === rb.Divisao;
        const winner = !sameDiv ? "—" : ra.Pos < rb.Pos ? a : ra.Pos > rb.Pos ? b : "Empate";
        return { epoca: s.epoca, ra, rb, sameDiv, winner };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [seasons, a, b]);

  const stats = useMemo(() => {
    let wA = 0, wB = 0, draws = 0, ptsA = 0, ptsB = 0;
    rows.forEach((r) => {
      ptsA += r.ra.Pts; ptsB += r.rb.Pts;
      if (!r.sameDiv) return;
      if (r.winner === a) wA++; else if (r.winner === b) wB++; else draws++;
    });
    return { wA, wB, draws, ptsA, ptsB };
  }, [rows, a, b]);

  if (!seasons.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] glow-panel p-6">
        <h1 className="text-2xl font-bold text-white glow-heading">Head-to-Head Histórico</h1>
        <p className="mt-1 text-sm text-slate-400">Confronto direto entre dois clubes época a época (mesma divisão = duelo válido).</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ClubeSelect label="Clube A" value={a} onChange={setA} options={clubes} exclude={b} />
        <ClubeSelect label="Clube B" value={b} onChange={setB} options={clubes} exclude={a} />
      </div>

      {a && b && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={`Vitórias ${a}`} value={stats.wA} accent="violet" />
            <StatCard label="Empates" value={stats.draws} accent="slate" />
            <StatCard label={`Vitórias ${b}`} value={stats.wB} accent="fuchsia" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label={`Pts totais ${a}`} value={stats.ptsA} accent="violet" />
            <StatCard label={`Pts totais ${b}`} value={stats.ptsB} accent="fuchsia" />
          </div>

          <div className="overflow-hidden rounded-[1.75rem] glow-panel">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-[0.16em] text-violet-300">
                <tr>
                  <th className="px-4 py-3 text-left">Época</th>
                  <th className="px-4 py-3 text-left">{a} (Div / Pos / Pts)</th>
                  <th className="px-4 py-3 text-left">{b} (Div / Pos / Pts)</th>
                  <th className="px-4 py-3 text-left">Vencedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/60 text-slate-200">
                {rows.map((r) => (
                  <tr key={r.epoca} className={r.sameDiv ? "" : "opacity-60"}>
                    <td className="px-4 py-2 font-medium">{r.epoca}</td>
                    <td className="px-4 py-2">D{r.ra.Divisao} · #{r.ra.Pos} · {r.ra.Pts}</td>
                    <td className="px-4 py-2">D{r.rb.Divisao} · #{r.rb.Pos} · {r.rb.Pts}</td>
                    <td className="px-4 py-2">
                      {r.sameDiv ? (
                        <span className={r.winner === a ? "text-violet-300 font-semibold" : r.winner === b ? "text-fuchsia-300 font-semibold" : "text-slate-400"}>{r.winner}</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Divisões diferentes</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Sem épocas comuns.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ClubeSelect({ label, value, onChange, options, exclude }: { label: string; value: string; onChange: (v: string) => void; options: string[]; exclude?: string }) {
  return (
    <label className="block rounded-2xl glow-panel p-4">
      <span className="text-xs uppercase tracking-[0.2em] text-violet-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0d1222] px-3 py-2 text-sm text-white">
        <option value="">— selecciona —</option>
        {options.filter((o) => o !== exclude).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "violet" | "fuchsia" | "slate" }) {
  const color = accent === "violet" ? "text-violet-200" : accent === "fuchsia" ? "text-fuchsia-200" : "text-slate-200";
  return (
    <div className="rounded-2xl glow-panel p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] glow-panel p-10 text-center">
      <p className="text-slate-300">Carrega um dataset para usar o Head-to-Head.</p>
      <Link to="/" className="mt-4 inline-block rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/30">Ir para upload</Link>
    </div>
  );
}
