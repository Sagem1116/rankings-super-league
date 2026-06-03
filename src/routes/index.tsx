import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CATEGORIES_ORDER, PAGES } from "@/lib/page-registry";
import { useFMStore } from "@/lib/store";

const HIGHLIGHT_PAGES = new Set([
  "Pontos_Totais_Fixos",
  "Coef_Clube_Fixos",
  "Pontos_Total_Pais",
  "Coef_Paises_Fixo",
  "Ranking_Treinador_Fixos",
  "Treinador_Coef_Fixos",
  "Posicoes_Treinador_Coef_Fixos",
  "Posicoes_Ranking_Treinador_Fixos",
  "Posicoes_Pontos_Totais_Fixos",
]);

const UploadPanel = lazy(() => import("@/components/upload-panel").then((module) => ({ default: module.UploadPanel })));

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { resultados, modoAtivo } = useFMStore();
  const hasData = Object.keys(resultados).length > 0;
  const CTA_PAGES = [
    { label: "Dashboard Clubes", to: "/dashboard/Dashboard_Clubes" },
    { label: "Dashboard Jogadores", to: "/dashboard/Dashboard_Jogadores" },
    { label: "Scouting", to: "/scouting" },
    { label: "Dashboard Treinadores", to: "/dashboard/Dashboard_Treinadores" },
  ];

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] glow-panel bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.24),transparent_48%),linear-gradient(180deg,rgba(8,10,21,0.94),rgba(3,5,13,0.99))] p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.22),transparent_45%)] blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col items-center justify-center gap-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-200/80">
              <span className="font-semibold">FMDataLab</span>
              <span className="hidden sm:inline">Football Manager scouting made premium</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
              Enhance your Football Manager player recruitment
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              FMDataLab calculates scores for players' proficiency in every playable role within Football Manager. Use these role scores to discover hidden talents, streamline squad and transfer decisions, and revolutionise your scouting.
            </p>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CTA_PAGES.map((page) => (
                <Link
                  key={page.label}
                  to={page.to}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_70px_-30px_rgba(167,139,250,0.55)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_22px_80px_-32px_rgba(167,139,250,0.6)]"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] glow-panel p-8">
                <h2 className="text-2xl font-semibold text-white glow-heading">Process and compare with style</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Upload your Football Manager dataset, process the metrics and explore formatted tables for clubs, countries, coaches and players.
                </p>
              </div>
              <div id="upload">
                <Suspense fallback={<div className="rounded-xl border border-border bg-card p-4 text-sm text-slate-300">Loading upload panel...</div>}>
                  <UploadPanel />
                </Suspense>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-[2rem] glow-panel p-6">
                <h3 className="text-xl font-semibold text-white glow-heading">What you get</h3>
                <ul className="mt-5 space-y-3 text-sm text-slate-300">
                  <li>• Dashboard ranking summaries for Clubs, Players, Coaches and Goals.</li>
                  <li>• Scouting views with side-by-side comparisons.</li>
                  <li>• Full table pages for every dataset category.</li>
                </ul>
              </div>
              <div className="rounded-[2rem] glow-panel bg-gradient-to-b from-violet-950/85 to-slate-950/85 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Quick links</p>
                <div className="mt-4 grid gap-3">
                  {[
                    "Dashboard Clubes",
                    "Dashboard Jogadores",
                    "Scouting",
                    "Dashboard Treinadores",
                  ].map((item) => (
                    <div key={item} className="rounded-3xl border border-violet-500/10 bg-[#090b12]/95 px-4 py-3 text-sm text-slate-200 shadow-[0_16px_40px_-28px_rgba(167,139,250,0.25)]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[2rem] glow-panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">App pages</h2>
              <p className="mt-1 text-sm text-slate-400">
                {hasData ? "Selecciona uma página para visualizar a tabela correspondente." : "Carrega um ficheiro para ativar as tabelas e dashboards."}
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {CATEGORIES_ORDER.map((cat) => {
            const items = PAGES.filter((p) => p.category === cat && p.kind !== "indice");
            if (!items.length) return null;
            return (
              <div key={cat} className="overflow-hidden rounded-[1.75rem] glow-panel">
                <div className="border-b border-white/10 px-6 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">{cat}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm text-slate-300">
                    <thead className="bg-slate-950/90 text-left text-xs uppercase tracking-[0.16em] text-violet-300">
                      <tr>
                        <th className="px-6 py-3">Page</th>
                        <th className="px-6 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-slate-950/60">
                      {items.map((p) => {
                        const disabled = (p.mode === "treinadores" && !modoAtivo.treinadores) || (p.mode === "jogadores" && !modoAtivo.jogadores);
                        const href = p.kind === "scouting" ? "/scouting" : `${p.kind === "dashboard" ? "/dashboard" : "/tabela"}/${p.key}`;
                        const isHighlighted = HIGHLIGHT_PAGES.has(p.key);
                        return (
                          <tr key={p.key} className={`${disabled ? "opacity-50" : "hover:bg-white/5"} ${isHighlighted ? "bg-violet-500/10 hover:bg-violet-500/15" : ""}`}>
                            <td className={`px-6 py-4 align-top font-medium ${isHighlighted ? "text-violet-100" : "text-slate-100"}`}>
                              {disabled ? p.title : <Link to={href} className={`transition ${isHighlighted ? "text-violet-100 hover:text-violet-50" : "hover:text-violet-100"}`}>{p.title}</Link>}
                            </td>
                            <td className="px-6 py-4 align-top text-slate-400">{p.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
