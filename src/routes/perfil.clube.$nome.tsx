import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { RankingEvolutionChart } from "@/components/ranking-evolution-chart";
import { ValueEvolutionChart } from "@/components/value-evolution-chart";
import { useFMStore } from "@/lib/store";
import { buildClubProfile } from "@/lib/profiles";

export const Route = createFileRoute("/perfil/clube/$nome")({ component: ClubeProfilePage });

function fmtMarkers(arr: { epoca: string; divisao: number; pos: number }[]) {
  if (!arr.length) return "—";
  return arr.map((m) => `${m.epoca} (Div ${m.divisao}, ${m.pos}º)`).join(", ");
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

function ClubeProfilePage() {
  const { nome } = Route.useParams();
  const { seasons, resultados } = useFMStore();
  const p = buildClubProfile(seasons, decodeURIComponent(nome));

  const coefData = useMemo(() => {
    const table = resultados["Coef_Clube_Fixos"];
    if (!table || !p || !table.epochKeys) return [];
    const row = table.rows.find((r) => String(r.Equipa) === p.nome);
    if (!row) return [];
    return table.epochKeys.map((e) => ({
      epoca: e,
      value: typeof row[e] === "number" ? row[e] : Number(row[e]) || 0,
      pos: typeof row[`__pos_${e}`] === "number" ? row[`__pos_${e}`] : undefined,
    }));
  }, [resultados, p]);

  if (!p) return (
    <div>
      <PageHeader title={decodeURIComponent(nome)} description="Perfil de clube" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Sem dados para este clube. Carrega o ficheiro Excel.
      </div>
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={p.nome}
        description={`${p.pais || "—"}${p.liga ? ` · ${p.liga}` : ""}${p.divisaoAtual ? ` · Div ${p.divisaoAtual}` : ""}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Campeão" value={p.campeao.length} detail={fmtMarkers(p.campeao)} />
        <Stat label="Promovido" value={p.promovido.length} detail={fmtMarkers(p.promovido)} />
        <Stat label="Quase Subida" value={p.quaseSubida.length} detail={fmtMarkers(p.quaseSubida)} />
        <Stat label="Quase Título" value={p.quaseTitulo.length} detail={fmtMarkers(p.quaseTitulo)} />
        <Stat label="Despromovido" value={p.despromovido.length} detail={fmtMarkers(p.despromovido)} />
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Treinador</h3>
        {p.treinadorAtual ? (
          <div className="mb-2 text-sm">
            Atual:{" "}
            <Link to="/perfil/treinador/$nome" params={{ nome: encodeURIComponent(p.treinadorAtual.nome) }}
              className="font-semibold text-violet-200 hover:underline">
              {p.treinadorAtual.nome}
            </Link>
            <span className="text-muted-foreground"> ({p.treinadorAtual.nac || "—"})</span>
          </div>
        ) : <div className="text-sm text-muted-foreground">Sem treinador registado.</div>}
        {p.treinadoresHistorico.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#111827] text-violet-200"><tr>
                <th className="px-2 py-1 text-left">Época</th><th className="px-2 py-1 text-left">Treinador</th><th className="px-2 py-1 text-left">Nac</th>
              </tr></thead>
              <tbody>{p.treinadoresHistorico.map((t, i) => (
                <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                  <td className="px-2 py-1">{t.epoca}</td>
                  <td className="px-2 py-1">
                    <Link to="/perfil/treinador/$nome" params={{ nome: encodeURIComponent(t.nome) }}
                      className="text-violet-200 hover:underline">{t.nome}</Link>
                  </td>
                  <td className="px-2 py-1">{t.nac}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <RankingEvolutionChart
          data={p.posicoes.map((r) => ({ epoca: r.epoca, pos: r.pos, divisao: r.divisao }))}
          title="Evolução do Ranking"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <ValueEvolutionChart
          title="Coeficiente de Clube (Fixos) por Época"
          data={coefData}
          valueLabel="Coef"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Histórico de Posições</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111827] text-violet-200"><tr>
              <th className="px-2 py-1 text-left">Época</th>
              <th className="px-2 py-1 text-left">Divisão</th>
              <th className="px-2 py-1 text-left">Pos</th>
              <th className="px-2 py-1 text-left">Inf</th>
              <th className="px-2 py-1 text-right">Pts</th>
            </tr></thead>
            <tbody>{p.posicoes.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">{r.epoca}</td>
                <td className="px-2 py-1">{r.divisao}</td>
                <td className="px-2 py-1">{r.pos}º</td>
                <td className="px-2 py-1">{r.inf || "—"}</td>
                <td className="px-2 py-1 text-right">{r.pts}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Plantel ({p.jogadores.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111827] text-violet-200"><tr>
              <th className="px-2 py-1 text-left">Jogador</th>
              <th className="px-2 py-1 text-right">Idade</th>
              <th className="px-2 py-1 text-right">C.A.</th>
              <th className="px-2 py-1 text-right">C.P.</th>
              <th className="px-2 py-1 text-right">Salário</th>
              <th className="px-2 py-1 text-right">VP</th>
            </tr></thead>
            <tbody>{p.jogadores.map((j, i) => (
              <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">
                  <Link to="/perfil/jogador/$nome" params={{ nome: encodeURIComponent(j.nome) }}
                    className="text-violet-200 hover:underline">{j.nome}</Link>
                </td>
                <td className="px-2 py-1 text-right">{j.idade}</td>
                <td className="px-2 py-1 text-right">{j.CA}</td>
                <td className="px-2 py-1 text-right">{j.CP}</td>
                <td className="px-2 py-1 text-right">{j.salario.toLocaleString("pt-PT")}</td>
                <td className="px-2 py-1 text-right">{j.VP.toLocaleString("pt-PT")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}