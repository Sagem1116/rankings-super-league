import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Calendar, Trophy, ArrowUp, ArrowDown, Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/timeline")({
  component: TimelinePage,
  head: () => ({ meta: [{ title: "Timeline — FMDataLab" }] }),
});

function TimelinePage() {
  const { seasons } = useFMStore();

  const events = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => b.epoca.localeCompare(a.epoca));
    return sorted.map((s) => {
      const campeoesDiv = new Map<number, { equipa: string; pts: number }>();
      const promovidos: string[] = [];
      const despromovidos: string[] = [];
      for (const r of s.rankings) {
        const inf = String(r.Inf || "").toUpperCase();
        const isC = /\bC\b/.test(inf), isP = /\bP\b/.test(inf), isD = /\bD\b/.test(inf);
        if (isC) campeoesDiv.set(r.Divisao, { equipa: r.Equipa, pts: r.Pts });
        if (isP) promovidos.push(r.Equipa);
        if (isD) despromovidos.push(r.Equipa);
      }
      const slCampeao = s.superLeague?.find((x) => x.Pos === 1 || /\bC\b/.test(String(x.Inf || "").toUpperCase()));
      return {
        epoca: s.epoca,
        campeoesDiv: [...campeoesDiv.entries()].sort((a, b) => a[0] - b[0]),
        promovidos, despromovidos, slCampeao,
      };
    });
  }, [seasons]);

  if (!seasons.length) return (
    <div>
      <PageHeader title="Timeline" description="Cronologia do save" />
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Importa pelo menos uma época para ver a timeline.
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Timeline" description="Cronologia das épocas — campeões de cada divisão, Super League, promovidos e despromovidos" />

      <div className="relative space-y-4 border-l-2 border-violet-500/30 pl-6">
        {events.map((e) => (
          <article key={e.epoca} className="relative rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="absolute -left-[34px] top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white shadow-lg">
              <Calendar className="h-3 w-3" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-violet-200">Época {e.epoca}</h3>

            {e.slCampeao && (
              <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-amber-300"><Award className="h-4 w-4" /><span className="font-bold">Super League:</span> 
                  <Link to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(e.slCampeao.Equipa) }} className="hover:underline">{e.slCampeao.Equipa}</Link>
                  {e.slCampeao.Treinador && <span className="text-xs text-amber-200/70">· treinador: <Link to="/perfil/treinador/$nome" params={{ nome: encodeURIComponent(e.slCampeao.Treinador) }} className="hover:underline">{e.slCampeao.Treinador}</Link></span>}
                </div>
              </div>
            )}

            {e.campeoesDiv.length > 0 && (
              <div className="mb-2">
                <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-violet-300"><Trophy className="h-3 w-3" /> Campeões</div>
                <div className="flex flex-wrap gap-2">
                  {e.campeoesDiv.map(([div, { equipa }]) => (
                    <Link key={div} to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(equipa) }}
                      className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs hover:border-violet-400">
                      Div {div}: <span className="font-bold text-violet-100">{equipa}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {e.promovidos.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-emerald-300"><ArrowUp className="h-3 w-3" /> Promovidos</div>
                  <div className="flex flex-wrap gap-1.5">{e.promovidos.map((c) => (
                    <Link key={c} to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(c) }} className="text-xs text-emerald-200 hover:underline">{c}</Link>
                  ))}</div>
                </div>
              )}
              {e.despromovidos.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-red-300"><ArrowDown className="h-3 w-3" /> Despromovidos</div>
                  <div className="flex flex-wrap gap-1.5">{e.despromovidos.map((c) => (
                    <Link key={c} to="/perfil/clube/$nome" params={{ nome: encodeURIComponent(c) }} className="text-xs text-red-200 hover:underline">{c}</Link>
                  ))}</div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
