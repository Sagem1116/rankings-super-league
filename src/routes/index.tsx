import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CATEGORIES_ORDER, PAGES } from "@/lib/page-registry";
import { useFMStore } from "@/lib/store";
import {
  Trophy,
  Radar,
  Swords,
  Crown,
  Database,
  Search,
  Globe2,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";

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

const UploadPanel = lazy(() =>
  import("@/components/upload-panel").then((m) => ({ default: m.UploadPanel })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FMDataLab — Rankings acumulados, H2H e domínio histórico" },
      {
        name: "description",
        content:
          "Plataforma analítica para Football Manager: rankings acumulados de clubes, países e treinadores, comparadores com radar charts, confrontos H2H e domínio por década.",
      },
      { property: "og:title", content: "FMDataLab — Analítica histórica para Football Manager" },
      {
        property: "og:description",
        content:
          "Rankings acumulados, comparadores multi-clube, H2H histórico e domínio por década — tudo num só sítio.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Trophy,
    title: "Rankings acumulados",
    desc: "Coeficiente UEFA-style com pesos fixos e somatórios integrais ao longo de todas as épocas — sem truncar a janela.",
    to: "/tabela/Coef_Clube_Fixos",
    cta: "Ver coeficientes",
  },
  {
    icon: Radar,
    title: "Comparador multi-clube",
    desc: "Compara 2+ clubes em radar charts: ataque, defesa, finanças, títulos. Lado a lado, com diferença visual imediata.",
    to: "/comparador/clubes",
    cta: "Abrir comparador",
  },
  {
    icon: Swords,
    title: "Head-to-Head histórico",
    desc: "Confrontos diretos entre dois clubes ao longo das épocas — vitórias, golos, pontos, época a época.",
    to: "/h2h",
    cta: "Comparar H2H",
  },
  {
    icon: Crown,
    title: "Domínio por década",
    desc: "Quem dominou cada janela de N épocas. Ranking deslizante para identificar dinastias e ciclos.",
    to: "/dominio",
    cta: "Ver dinastias",
  },
  {
    icon: Globe2,
    title: "Perfis & mapa-mundo",
    desc: "Páginas dedicadas a clubes, países, treinadores e jogadores, com evolução, valor de mercado e geografia.",
    to: "/mapa-mundo",
    cta: "Explorar mapa",
  },
  {
    icon: Users,
    title: "Scouting de jogadores",
    desc: "Stats de jogadores cruzadas com clubes e ligas, prontas para identificar oportunidades de recrutamento.",
    to: "/scouting",
    cta: "Abrir scouting",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Importa épocas",
    desc: "Carrega um ou mais ficheiros Excel — uma época por ficheiro. Validação automática avisa-te se faltar algo.",
  },
  {
    n: "02",
    title: "Acumula histórico",
    desc: "As novas épocas são fundidas com as já existentes em memória, sem perder dados.",
  },
  {
    n: "03",
    title: "Explora & exporta",
    desc: "Tabelas, dashboards e comparadores actualizam automaticamente. Exporta tudo para Excel ou JSON.",
  },
] as const;

function Index() {
  const { resultados, modoAtivo, seasons, ultimaEpoca } = useFMStore();
  const hasData = Object.keys(resultados).length > 0;
  const tableCount = Object.keys(resultados).length;

  return (
    <div className="space-y-16">
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden rounded-[2rem] glow-panel">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="relative grid gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> FMDataLab · v1
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              A camada analítica que faltava ao teu{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                Football Manager
              </span>
              .
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Rankings acumulados ao estilo coeficiente UEFA, comparadores multi-clube com radar
              charts, confrontos H2H e domínio por década. Tudo a partir dos teus próprios
              <em className="not-italic text-violet-200"> exports</em>.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#upload"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_70px_-20px_rgba(167,139,250,0.6)] transition hover:-translate-y-0.5"
              >
                {hasData ? "Importar nova época" : "Importar primeira época"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/comparador/clubes"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Radar className="h-4 w-4" /> Ver comparador
              </Link>
            </div>
            {hasData && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-slate-400">
                <span><strong className="text-violet-200">{seasons.length}</strong> épocas em memória</span>
                <span><strong className="text-violet-200">{tableCount}</strong> tabelas computadas</span>
                {ultimaEpoca && <span>última época: <strong className="text-violet-200">{ultimaEpoca}</strong></span>}
              </div>
            )}
          </div>

          {/* Mini metric cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Trophy, label: "Coef. acumulado", val: "5 anos / ∞" },
              { icon: Radar, label: "Radar multi-clube", val: "2+ clubes" },
              { icon: Swords, label: "H2H histórico", val: "Época a época" },
              { icon: Crown, label: "Domínio", val: "Janela N épocas" },
            ].map((m) => (
              <div
                key={m.label}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 backdrop-blur transition hover:border-violet-400/30 hover:from-violet-500/10"
              >
                <m.icon className="h-5 w-5 text-violet-300" />
                <div className="mt-3 text-2xl font-bold text-white">{m.val}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== FEATURES ============================== */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Funcionalidades</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Tudo o que precisas para analisar gerações.</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-[0_20px_60px_-30px_rgba(167,139,250,0.5)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.18),transparent_60%)] opacity-0 transition group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 group-hover:text-violet-200">
                  {f.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================== WORKFLOW + UPLOAD ============================== */}
      <section id="upload" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Como funciona</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Três passos. Sem servidor, sem fricção.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Os dados nunca saem do teu browser. Podes exportar tudo em Excel ou JSON e reutilizar
              noutras apps.
            </p>
          </div>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="font-mono text-2xl font-bold text-violet-300/80">{s.n}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{s.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{s.desc}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 text-xs text-violet-100/80">
            <Database className="h-4 w-4 shrink-0" />
            <span>Tudo é processado localmente. Os teus saves de FM não saem do dispositivo.</span>
          </div>
        </div>
        <div>
          <Suspense
            fallback={
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                A carregar painel de import…
              </div>
            }
          >
            <UploadPanel />
          </Suspense>
        </div>
      </section>

      {/* ============================== PAGE INDEX ============================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Índice completo</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Todas as páginas da app</h2>
            <p className="mt-1 text-sm text-slate-400">
              {hasData
                ? "Selecciona uma página para abrir a tabela correspondente."
                : "Importa um ficheiro para activar tabelas e dashboards."}
            </p>
          </div>
          <Search className="hidden h-5 w-5 text-slate-500 sm:block" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {CATEGORIES_ORDER.map((cat) => {
            const items = PAGES.filter((p) => p.category === cat && p.kind !== "indice");
            if (!items.length) return null;
            return (
              <div key={cat} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/40">
                <div className="border-b border-white/10 px-6 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{cat}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/5 text-sm text-slate-300">
                    <tbody className="divide-y divide-white/5">
                      {items.map((p) => {
                        const disabled =
                          (p.mode === "treinadores" && !modoAtivo.treinadores) ||
                          (p.mode === "jogadores" && !modoAtivo.jogadores);
                        const href =
                          p.kind === "scouting"
                            ? "/scouting"
                            : `${p.kind === "dashboard" ? "/dashboard" : "/tabela"}/${p.key}`;
                        const isHighlighted = HIGHLIGHT_PAGES.has(p.key);
                        return (
                          <tr
                            key={p.key}
                            className={`${disabled ? "opacity-40" : "hover:bg-white/5"} ${isHighlighted ? "bg-violet-500/5" : ""}`}
                          >
                            <td className="w-1/3 px-6 py-3 align-top font-medium">
                              {disabled ? (
                                <span className="text-slate-400">{p.title}</span>
                              ) : (
                                <Link
                                  to={href}
                                  className={`transition ${isHighlighted ? "text-violet-200 hover:text-violet-100" : "text-slate-100 hover:text-violet-200"}`}
                                >
                                  {p.title}
                                </Link>
                              )}
                            </td>
                            <td className="px-6 py-3 align-top text-xs text-slate-400">{p.description}</td>
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
