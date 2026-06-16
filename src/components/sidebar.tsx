import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Home, Search, Trophy, Globe, UserSquare2, User2, Goal, Sparkles, BarChart3, Layers, Hash, Award } from "lucide-react";
import { CATEGORIES_ORDER, PAGES } from "@/lib/page-registry";
import type { PageCategory } from "@/lib/types";
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
  "Super_League_Campeoes",
  "Hall_Of_Fame",
]);

const CAT_ICON: Record<PageCategory, any> = {
  Clubes: Trophy, "Países": Globe, Treinadores: UserSquare2, Jogadores: User2,
  Golos: Goal, "Rankings Especiais": Sparkles, "Divisões": Layers,
  "Competições": Award,
  Dashboards: BarChart3, Scouting: Search, "Administração": Home,
  "Posições Geral": Hash,
};

const QUICK_LINKS = [
  { label: "Dashboard Clubes", icon: Trophy, to: "/dashboard/Dashboard_Clubes" },
  { label: "Hall of Fame", icon: Award, to: "/hall-of-fame" },
  { label: "Timeline", icon: Hash, to: "/timeline" },
  { label: "Scouting", icon: Search, to: "/scouting" },
  { label: "Mapa Mundo", icon: Globe, to: "/dashboard/Mapa_Mundo" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES_ORDER.map((c) => [c, true])),
  );
  const { modoAtivo, resultados } = useFMStore();

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-violet-500/10 bg-[#09061b]/95 p-4 text-[15px] text-slate-200 shadow-[0_0_120px_-80px_rgba(167,139,250,0.18)]">
      <div className="rounded-[2rem] border border-violet-500/15 bg-[#110a2d]/90 p-4 shadow-[0_16px_40px_-16px_rgba(167,139,250,0.22)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">Quick access</p>
        <div className="mt-3 space-y-2">
          {QUICK_LINKS.map((item) => {
            const active = path === item.to;
            return (
              <Link key={item.label} to={item.to} onClick={onNavigate}
                className={`flex items-center gap-2 rounded-[1.5rem] border px-3 py-2 text-sm font-semibold transition ${active ? "bg-violet-500/20 text-white shadow-[0_0_20px_-6px_rgba(167,139,250,0.35)]" : "bg-[#100b26] text-slate-200 hover:bg-violet-500/10 hover:text-white"}`}>
                <item.icon className="h-4 w-4 text-violet-300" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-violet-500/15 bg-[#110a2d]/90 p-4 shadow-[0_16px_40px_-16px_rgba(167,139,250,0.22)]">
        <Link to="/" onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-[14px] font-semibold transition ${path === "/" ? "bg-violet-500/20 text-white shadow-[0_0_24px_-8px_rgba(167,139,250,0.35)]" : "text-slate-200 hover:bg-violet-500/10 hover:text-white"}`}>
          <Home className="h-4 w-4 text-violet-300" /> Índice
        </Link>
        <Link to="/scouting" onClick={onNavigate}
          className={`mt-2 flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-[14px] font-semibold transition ${path.startsWith("/scouting") ? "bg-violet-500/20 text-white shadow-[0_0_24px_-8px_rgba(167,139,250,0.35)]" : "text-slate-200 hover:bg-violet-500/10 hover:text-white"}`}>
          <Search className="h-4 w-4 text-violet-300" /> Scouting
        </Link>
      </div>

      {CATEGORIES_ORDER.filter((c) => c !== "Scouting").map((cat) => {
        const Icon = CAT_ICON[cat];
        const items = PAGES.filter((p) => p.category === cat && p.kind !== "scouting" && p.kind !== "indice");
        if (!items.length) return null;
        const isOpen = open[cat];
        return (
          <div key={cat} className="rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)]">
            <button
              onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
              className="flex w-full items-center gap-2 rounded-[1.75rem] px-4 py-3 text-left text-[12px] font-bold uppercase tracking-[0.18em] text-violet-200 transition hover:bg-white/10"
            >
              <Icon className="h-4 w-4 text-violet-300" />
              <span className="flex-1">{cat}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
            </button>
            {isOpen && (
              <div className="space-y-1 border-t border-white/10 px-3 pt-2 pb-3">
                {items.map((p) => {
                  const disabled =
                    (p.mode === "treinadores" && !modoAtivo.treinadores) ||
                    (p.mode === "jogadores" && !modoAtivo.jogadores);
                  const empty = !resultados[p.key];
                  const route = p.kind === "dashboard" ? "/dashboard/$key" : "/tabela/$key";
                  const isHighlighted = HIGHLIGHT_PAGES.has(p.key);
                  return disabled ? (
                    <div key={p.key} className={`truncate rounded-2xl px-3 py-2 text-[13px] text-slate-500 opacity-60 ${isHighlighted ? "bg-violet-500/10" : ""}`}>
                      {p.title}
                    </div>
                  ) : (
                    <Link key={p.key} to={route} params={{ key: p.key }} onClick={onNavigate}
                      className={`block truncate rounded-2xl px-3 py-2 text-[13px] font-medium transition ${isHighlighted ? "bg-violet-500/10 text-violet-100 hover:bg-violet-500/20" : "text-slate-200 hover:bg-violet-500/10 hover:text-white"} ${empty ? "opacity-60" : ""} ${path.endsWith("/" + p.key) ? "bg-violet-500/15 text-white" : ""}`}>
                      {p.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
