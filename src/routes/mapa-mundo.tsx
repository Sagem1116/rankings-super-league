import { createFileRoute } from "@tanstack/react-router";
import { WorldMap } from "@/components/world-map";

export const Route = createFileRoute("/mapa-mundo")({
  component: MapaMundo,
});

function MapaMundo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-violet-200">Mapa Mundo</h1>
        <p className="text-muted-foreground">
          Distribuição geográfica de top clubes e jogadores por país
        </p>
      </div>
      <WorldMap />
    </div>
  );
}