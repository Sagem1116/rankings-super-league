import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PAGE_BY_KEY } from "@/lib/page-registry";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/tabela/$key")({ component: TabelaPage });

function TabelaPage() {
  const { key } = Route.useParams();
  const meta = PAGE_BY_KEY[key];
  const { resultados, modoAtivo } = useFMStore();

  if (!meta) return <div className="text-muted-foreground">Página desconhecida: {key}</div>;

  if ((meta.mode === "treinadores" && !modoAtivo.treinadores) ||
      (meta.mode === "jogadores" && !modoAtivo.jogadores)) {
    return (
      <div>
        <PageHeader title={meta.title} description={meta.description} />
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Ative os {meta.mode === "treinadores" ? "Treinadores" : "Jogadores"} para calcular esta página.
        </div>
      </div>
    );
  }

  const table = resultados[key];
  return (
    <div>
      <PageHeader title={meta.title} description={meta.description} />
      {table ? <DataTable table={table} /> : (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Sem dados. Carrega um ficheiro Excel e clica em Processar.
        </div>
      )}
    </div>
  );
}
