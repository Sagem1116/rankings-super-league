import type { NormSeason } from "./calc/engine";
import type { RankingTable, ModoAtivo } from "./types";

export interface RankingsJSONv1 {
  version: 1;
  exportedAt: string;
  app: "FMDataLab";
  ultimaEpoca: string;
  modoAtivo: ModoAtivo;
  seasons: Array<Omit<NormSeason, "equipasPais" | "pesosFixos"> & {
    equipasPais: Array<[string, string]>;
    pesosFixos: Array<[number, number]>;
  }>;
  resultados: Record<string, RankingTable>;
}

export function buildExportPayload(
  seasons: NormSeason[],
  resultados: Record<string, RankingTable>,
  ultimaEpoca: string,
  modoAtivo: ModoAtivo,
): RankingsJSONv1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "FMDataLab",
    ultimaEpoca,
    modoAtivo,
    seasons: seasons.map((s) => ({
      ...s,
      equipasPais: [...s.equipasPais.entries()],
      pesosFixos: [...s.pesosFixos.entries()],
    })),
    resultados,
  };
}

export function parseImportPayload(text: string): {
  seasons: NormSeason[];
  resultados: Record<string, RankingTable>;
  ultimaEpoca: string;
  modoAtivo: ModoAtivo;
} {
  const data = JSON.parse(text) as RankingsJSONv1;
  if (!data || typeof data !== "object") throw new Error("JSON inválido.");
  if (data.app !== "FMDataLab") throw new Error("Ficheiro não pertence ao FMDataLab.");
  if (data.version !== 1) throw new Error(`Versão não suportada: ${(data as any).version}`);
  if (!Array.isArray(data.seasons)) throw new Error("Campo 'seasons' em falta.");
  if (!data.resultados || typeof data.resultados !== "object") throw new Error("Campo 'resultados' em falta.");
  const seasons: NormSeason[] = data.seasons.map((s) => ({
    ...s,
    equipasPais: new Map(s.equipasPais || []),
    pesosFixos: new Map(s.pesosFixos || []),
  }));
  return {
    seasons,
    resultados: data.resultados,
    ultimaEpoca: data.ultimaEpoca || (seasons.at(-1)?.epoca ?? ""),
    modoAtivo: data.modoAtivo,
  };
}

export function downloadJSON(payload: RankingsJSONv1, filename = "fmdatalab-rankings.json") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
