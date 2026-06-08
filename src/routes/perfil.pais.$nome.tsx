import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { RankingEvolutionChart } from "@/components/ranking-evolution-chart";
import { useFMStore } from "@/lib/store";
import { buildCountryProfile } from "@/lib/profiles";

export const Route = createFileRoute("/perfil/pais/$nome")({ component: CountryProfilePage });

function fmtMarkers(arr: { epoca: string; divisao: number; pos: number; clube?: string }[]) {
  if (!arr.length) return "—";
  return arr.map((m) => `${m.epoca} — ${m.clube ?? ""} (Div ${m.divisao}, ${m.pos}º)`).join(", ");
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

function CountryProfilePage() {
  const { nome } = Route.useParams();
  const { seasons } = useFMStore();
  const p = buildCountryProfile(seasons, decodeURIComponent(nome));

  if (!p) return (
    <div>
      <PageHeader title={decodeURIComponent(nome)} description="Perfil de país" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Sem dados para este país. Carrega o ficheiro Excel.
      </div>
    </div>
  );

  const clubesUnicos = Array.from(new Set(p.clubes.map((c) => c.clube)));
  const numEpocas = new Set(p.posicoes.map((r) => r.epoca)).size;

  return (
    <div className="space-y-6">
      <PageHeader title={p.nome} description={`Clubes: ${clubesUnicos.length} · Épocas: ${numEpocas}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Campeões" value={p.campeao.length} detail={fmtMarkers(p.campeao)} />
        <Stat label="Promovidos" value={p.promovido.length} detail={fmtMarkers(p.promovido)} />
        <Stat label="Despromovidos" value={p.despromovido.length} detail={fmtMarkers(p.despromovido)} />
        <Stat label="Quase Subida" value={p.quaseSubida.length} detail={fmtMarkers(p.quaseSubida)} />
        <Stat label="Quase Título" value={p.quaseTitulo.length} detail={fmtMarkers(p.quaseTitulo)} />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <RankingEvolutionChart
          data={p.posicoes.map((r) => ({ epoca: r.epoca, pos: r.pos, divisao: r.divisao, clube: r.clube }))}
          title="Evolução do Ranking dos Clubes do País"
          seriesKey="clube"
          showLegend={true}
        />
        <div className="mt-3 text-xs text-muted-foreground">
          Nota: cada linha representa um clube do país ao longo das épocas.
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Clubes por país</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111827] text-violet-200"><tr>
              <th className="px-2 py-1 text-left">Clube</th>
              <th className="px-2 py-1 text-left">Liga</th>
            </tr></thead>
            <tbody>{p.clubes.map((c, i) => (
              <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">
                  <Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(c.clube) }}
                    className="text-violet-200 hover:underline">
                    {c.clube}
                  </Link>
                </td>
                <td className="px-2 py-1">{c.liga || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Histórico de posições</h3>
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
            <tbody>{p.posicoes.map((r, i) => (
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
