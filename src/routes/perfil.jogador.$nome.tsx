import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useFMStore } from "@/lib/store";
import { buildPlayerProfile } from "@/lib/profiles";

export const Route = createFileRoute("/perfil/jogador/$nome")({ component: PlayerProfilePage });

function PlayerProfilePage() {
  const { nome } = Route.useParams();
  const { seasons } = useFMStore();
  const p = buildPlayerProfile(seasons, decodeURIComponent(nome));
  if (!p) return (
    <div>
      <PageHeader title={decodeURIComponent(nome)} description="Perfil de jogador" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Sem dados para este jogador. Carrega o ficheiro Excel.
      </div>
    </div>
  );
  const last = p.porEpoca[p.porEpoca.length - 1];
  return (
    <div className="space-y-6">
      <PageHeader title={p.nome}
        description={last ? `${last.clube} · ${last.liga} · ${last.idade} anos` : "Perfil de jogador"} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="text-xs text-muted-foreground">Total Golos</div>
          <div className="text-2xl font-bold text-violet-200">{p.totalGolos}</div>
        </div>
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="text-xs text-muted-foreground">Total Assistências</div>
          <div className="text-2xl font-bold text-violet-200">{p.totalAst}</div>
        </div>
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="text-xs text-muted-foreground">Clubes</div>
          <div className="text-2xl font-bold text-violet-200">{p.clubes.length}</div>
        </div>
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="text-xs text-muted-foreground">Épocas</div>
          <div className="text-2xl font-bold text-violet-200">{p.porEpoca.length}</div>
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#0b1228]/95 p-4 shadow-[0_30px_80px_-40px_rgba(99,102,241,0.25)]">
        <h3 className="mb-3 text-lg font-bold text-violet-200">Histórico</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#111827] text-violet-200"><tr>
              <th className="px-2 py-1 text-left">Época</th>
              <th className="px-2 py-1 text-left">Clube</th>
              <th className="px-2 py-1 text-left">Liga</th>
              <th className="px-2 py-1 text-right">Idade</th>
              <th className="px-2 py-1 text-right">Gls</th>
              <th className="px-2 py-1 text-right">Ast</th>
              <th className="px-2 py-1 text-right">C.A.</th>
              <th className="px-2 py-1 text-right">C.P.</th>
              <th className="px-2 py-1 text-right">Salário</th>
              <th className="px-2 py-1 text-right">VP</th>
            </tr></thead>
            <tbody>{p.porEpoca.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-card/60" : "bg-card"}>
                <td className="px-2 py-1">{r.epoca}</td>
                <td className="px-2 py-1">
                  <Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(r.clube) }}
                    className="text-violet-200 hover:underline">{r.clube}</Link>
                </td>
                <td className="px-2 py-1">{r.liga}</td>
                <td className="px-2 py-1 text-right">{r.idade}</td>
                <td className="px-2 py-1 text-right">{r.gls}</td>
                <td className="px-2 py-1 text-right">{r.ast}</td>
                <td className="px-2 py-1 text-right">{r.CA}</td>
                <td className="px-2 py-1 text-right">{r.CP}</td>
                <td className="px-2 py-1 text-right">{r.salario.toLocaleString("pt-PT")}</td>
                <td className="px-2 py-1 text-right">{r.VP.toLocaleString("pt-PT")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}