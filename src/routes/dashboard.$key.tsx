import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { WorldMap } from "@/components/world-map";
import { PAGE_BY_KEY } from "@/lib/page-registry";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/$key")({ component: DashboardPage });

const SETS: Record<string, string[]> = {
  Dashboard_Clubes: ["Pontos_Totais", "Coef_Clube_Fixos", "Pontos_Totais_Fixos", "Coef_Clube_Dinamicos", "Comparador_Clubes", "Ranking_Underdogs", "Rising_Stars", "Ranking_Rolo_Compressor", "Ranking_Muralha"],
  Dashboard_Paises: ["Coef_Paises_Fixo", "Pontos_Total_Pais", "Pontos_Media_Pais", "Coef_Paises", "Coef_Paises_Dinamico"],
  Dashboard_Treinadores: ["Ranking_Treinador", "Ranking_Treinador_Fixos", "Treinador_Coef", "Treinador_Coef_Fixos"],
  Dashboard_Jogadores: ["Performance_Jogadores", "Golos", "Assistencias"],
  Dashboard_Golos: ["Golos_Marcados", "Golos_Sofridos"],
};

function DashboardPage() {
  const { key } = Route.useParams();
  const meta = PAGE_BY_KEY[key];
  const { resultados } = useFMStore();
  if (!meta) return null;

  if (key === "Mapa_Mundo") {
    return (
      <div>
        <PageHeader title={meta.title} description={meta.description} />
        <WorldMap />
      </div>
    );
  }

  const keys = SETS[key] || [];
  return (
    <div>
      <PageHeader title={meta.title} description={meta.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        {keys.map((k) => {
          const t = resultados[k];
          if (!t) return (
            <div key={k} className="rounded-[2rem] glow-panel p-4">
              <h3 className="mb-2 font-bold text-violet-100 glow-heading">{k}</h3>
              <p className="text-sm text-slate-400">Sem dados.</p>
            </div>
          );
          return (
            <div key={k} className="rounded-[2rem] glow-panel p-4">
              <h3 className="mb-2 font-bold text-violet-100 glow-heading">{t.title} — Top 10</h3>
              <DataTable table={t} limit={10} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
