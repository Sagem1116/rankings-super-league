import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/hall-of-fame")({
  component: HallOfFamePage,
  head: () => ({ meta: [{ title: "Hall of Fame — FMDataLab" }] }),
});

function HallOfFamePage() {
  const { seasons } = useFMStore();

  const data = useMemo(() => {
    const coaches = new Map<string, { titulosLiga: number; titulosSL: number; promos: number; total: number }>();
    const clubes = new Map<string, { titulosLiga: number; titulosSL: number; promos: number; pais: string; total: number }>();
    const paises = new Map<string, { titulos: number; clubes: Set<string> }>();

    for (const s of seasons) {
      // Liga (do ranking)
      for (const r of s.rankings) {
        const inf = String(r.Inf || "").toUpperCase();
        const isC = /\bC\b/.test(inf), isP = /\bP\b/.test(inf);
        const pais = s.equipasPais.get(r.Equipa) || "—";
        const cl = clubes.get(r.Equipa) || { titulosLiga: 0, titulosSL: 0, promos: 0, pais, total: 0 };
        if (isC && r.Divisao === 1) { cl.titulosLiga++; cl.total++; }
        if (isP) { cl.promos++; }
        cl.pais = cl.pais || pais;
        clubes.set(r.Equipa, cl);

        if (isC && r.Divisao === 1) {
          const pp = paises.get(pais) || { titulos: 0, clubes: new Set<string>() };
          pp.titulos++; pp.clubes.add(r.Equipa);
          paises.set(pais, pp);
        }

        // treinador desse clube nessa época
        const t = s.treinadores.find((tt) => tt.Clube === r.Equipa);
        if (t && isC && r.Divisao === 1) {
          const co = coaches.get(t.Nome) || { titulosLiga: 0, titulosSL: 0, promos: 0, total: 0 };
          co.titulosLiga++; co.total++;
          coaches.set(t.Nome, co);
        }
        if (t && isP) {
          const co = coaches.get(t.Nome) || { titulosLiga: 0, titulosSL: 0, promos: 0, total: 0 };
          co.promos++;
          coaches.set(t.Nome, co);
        }
      }
      // Super League
      if (s.superLeague) {
        for (const sl of s.superLeague) {
          const isC = sl.Pos === 1 || /\bC\b/.test(String(sl.Inf || "").toUpperCase());
          if (!isC) continue;
          const cl = clubes.get(sl.Equipa) || { titulosLiga: 0, titulosSL: 0, promos: 0, pais: s.equipasPais.get(sl.Equipa) || "—", total: 0 };
          cl.titulosSL++; cl.total++;
          clubes.set(sl.Equipa, cl);
          if (sl.Treinador) {
            const co = coaches.get(sl.Treinador) || { titulosLiga: 0, titulosSL: 0, promos: 0, total: 0 };
            co.titulosSL++; co.total++;
            coaches.set(sl.Treinador, co);
          }
        }
      }
    }

    const topCoaches = [...coaches.entries()]
      .map(([nome, v]) => ({ nome, ...v }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    const topClubes = [...clubes.entries()]
      .map(([nome, v]) => ({ nome, ...v }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    const topPaises = [...paises.entries()]
      .map(([nome, v]) => ({ nome, titulos: v.titulos, clubes: v.clubes.size }))
      .sort((a, b) => b.titulos - a.titulos)
      .slice(0, 15);

    return { topCoaches, topClubes, topPaises };
  }, [seasons]);

  if (!seasons.length) return (
    <div>
      <PageHeader title="Hall of Fame" description="Lendas do save" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Importa pelo menos uma época para ver o Hall of Fame.
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Hall of Fame" description="As lendas do teu save — agrega títulos nacionais e da Super League" />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-4">
          <div className="mb-3 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" /><h3 className="text-lg font-bold text-amber-200">Top Treinadores</h3></div>
          <table className="w-full text-xs">
            <thead className="text-amber-200"><tr><th className="px-2 py-1 text-left">#</th><th className="text-left">Treinador</th><th className="text-right">Liga</th><th className="text-right">SL</th><th className="text-right">Promos</th><th className="text-right">Total</th></tr></thead>
            <tbody>{data.topCoaches.map((c, i) => (
              <tr key={c.nome} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">{i + 1}</td>
                <td><Link to="/perfil/treinador/$nome" params={{ nome: encodeURIComponent(c.nome) }} className="text-amber-200 hover:underline">{c.nome}</Link></td>
                <td className="text-right">{c.titulosLiga}</td>
                <td className="text-right text-amber-400">{c.titulosSL}</td>
                <td className="text-right">{c.promos}</td>
                <td className="text-right font-bold">{c.total}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className="rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-card p-4">
          <div className="mb-3 flex items-center gap-2"><Trophy className="h-5 w-5 text-violet-300" /><h3 className="text-lg font-bold text-violet-200">Top Clubes</h3></div>
          <table className="w-full text-xs">
            <thead className="text-violet-200"><tr><th className="px-2 py-1 text-left">#</th><th className="text-left">Clube</th><th className="text-left">País</th><th className="text-right">Liga</th><th className="text-right">SL</th><th className="text-right">Total</th></tr></thead>
            <tbody>{data.topClubes.map((c, i) => (
              <tr key={c.nome} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">{i + 1}</td>
                <td><Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(c.nome) }} className="text-violet-200 hover:underline">{c.nome}</Link></td>
                <td className="text-muted-foreground">{c.pais}</td>
                <td className="text-right">{c.titulosLiga}</td>
                <td className="text-right text-amber-400">{c.titulosSL}</td>
                <td className="text-right font-bold">{c.total}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2"><Medal className="h-5 w-5 text-emerald-400" /><h3 className="text-lg font-bold text-emerald-200">Top Países</h3></div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {data.topPaises.map((p, i) => (
            <Link key={p.nome} to="/perfil/pais/$nome" params={{ nome: encodeURIComponent(p.nome) }} className="rounded-md border border-border bg-secondary/40 p-3 hover:border-emerald-500/50">
              <div className="text-xs text-muted-foreground">#{i + 1}</div>
              <div className="font-bold text-emerald-200">{p.nome}</div>
              <div className="text-xs">{p.titulos} título(s) · {p.clubes} clube(s)</div>
            </Link>
          ))}
        </div>
      </section>

      {!data.topCoaches.length && !data.topClubes.length && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          <Award className="mx-auto mb-2 h-8 w-8 opacity-50" /> Ainda não há títulos registados nas épocas importadas.
        </div>
      )}
    </div>
  );
}
