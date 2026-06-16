import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { RankingEvolutionChart } from "@/components/ranking-evolution-chart";
import { ValueEvolutionChart } from "@/components/value-evolution-chart";
import { useFMStore } from "@/lib/store";
import { buildCoachProfile } from "@/lib/profiles";

export const Route = createFileRoute("/perfil/treinador/$nome")({ component: CoachProfilePage });

function fmt(arr: { epoca: string; divisao: number; pos: number; clube?: string }[]) {
  if (!arr.length) return "—";
  return arr.map((m) => `${m.clube ? m.clube + " — " : ""}${m.epoca} (Div ${m.divisao}, ${m.pos}º)`).join(", ");
}

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-md bg-secondary/40 p-3" title={detail}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-violet-200">{value}</div>
      {detail && <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{detail}</div>}
    </div>
  );
}

function CoachProfilePage() {
  const { nome } = Route.useParams();
  const { seasons, resultados } = useFMStore();
  const p = buildCoachProfile(seasons, decodeURIComponent(nome));

  const coefData = useMemo(() => {
    const table = resultados["Treinador_Coef_Fixos"];
    if (!table || !p || !table.epochKeys) return [];
    const row = table.rows.find((r) => String(r.Treinador) === p.nome);
    if (!row) return [];
    return table.epochKeys.map((e) => ({
      epoca: e,
      value: typeof row[e] === "number" ? row[e] : Number(row[e]) || 0,
      pos: typeof row[`__pos_${e}`] === "number" ? row[`__pos_${e}`] : undefined,
    }));
  }, [resultados, p]);

  if (!p) return (
    <div>
      <PageHeader title={decodeURIComponent(nome)} description="Perfil de treinador" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Sem dados para este treinador. Carrega o ficheiro Excel.
      </div>
    </div>
  );
  const totalTitulosNac = p.campeao.length;
  const totalTitulosSL = p.campeaoSL.length;
  const totalConquistas = totalTitulosNac + totalTitulosSL + p.promovido.length;

  return (
    <div className="space-y-6">
      <PageHeader title={p.nome} description={`Nacionalidade: ${p.nac || "—"} · ${totalConquistas} conquista(s)`} />

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-violet-300">Conquistas Nacionais</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="🏆 Campeão (Liga)" value={p.campeao.length} detail={fmt(p.campeao)} />
          <Stat label="⬆️ Promovido" value={p.promovido.length} detail={fmt(p.promovido)} />
          <Stat label="Quase Subida" value={p.quaseSubida.length} detail={fmt(p.quaseSubida)} />
          <Stat label="Quase Título" value={p.quaseTitulo.length} detail={fmt(p.quaseTitulo)} />
          <Stat label="⬇️ Despromovido" value={p.despromovido.length} detail={fmt(p.despromovido)} />
        </div>
      </section>

      {p.superLeague.length > 0 && (
        <section className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-300">Super League</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="🏆 Campeão SL" value={p.campeaoSL.length} detail={fmt(p.campeaoSL)} />
            <Stat label="🥈 Finalista SL" value={p.finalistaSL.length} detail={fmt(p.finalistaSL)} />
            <Stat label="🥉 Pódio SL" value={p.podioSL.length} detail={fmt(p.podioSL)} />
            <Stat label="Aparições SL" value={p.superLeague.length} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#111827] text-amber-200"><tr>
                <th className="px-2 py-1 text-left">Época</th>
                <th className="px-2 py-1 text-left">Clube</th>
                <th className="px-2 py-1 text-left">Pos</th>
                <th className="px-2 py-1 text-left">Inf</th>
                <th className="px-2 py-1 text-right">Pts</th>
              </tr></thead>
              <tbody>{p.superLeague.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                  <td className="px-2 py-1">{r.epoca}</td>
                  <td className="px-2 py-1"><Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(r.clube) }} className="text-amber-200 hover:underline">{r.clube}</Link></td>
                  <td className="px-2 py-1">{r.pos}º {r.pos === 1 && "🏆"}{r.pos === 2 && "🥈"}{r.pos === 3 && "🥉"}</td>
                  <td className="px-2 py-1">{r.inf || "—"}</td>
                  <td className="px-2 py-1 text-right">{r.pts || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}


      <section className="rounded-lg border border-border bg-card p-4">
        <RankingEvolutionChart
          data={p.passagens.map((r) => ({ epoca: r.epoca, pos: r.pos, divisao: r.divisao }))}
          title="Evolução do Ranking dos Clubes"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <ValueEvolutionChart
          title="Coeficiente (Fixos) por Época"
          data={coefData}
          valueLabel="Coef"
        />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Passagens por Clube</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111827] text-violet-200"><tr>
              <th className="px-2 py-1 text-left">Época</th>
              <th className="px-2 py-1 text-left">Clube</th>
              <th className="px-2 py-1 text-left">Divisão</th>
              <th className="px-2 py-1 text-left">Pos</th>
              <th className="px-2 py-1 text-left">Inf</th>
              <th className="px-2 py-1 text-right">Pts</th>
            </tr></thead>
            <tbody>{p.passagens.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">{r.epoca}</td>
                <td className="px-2 py-1">
                  <Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(r.clube) }}
                    className="text-violet-200 hover:underline">{r.clube}</Link>
                </td>
                <td className="px-2 py-1">{r.divisao}</td>
                <td className="px-2 py-1">{r.pos}º</td>
                <td className="px-2 py-1">{r.inf || "—"}</td>
                <td className="px-2 py-1 text-right">{r.pts}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}