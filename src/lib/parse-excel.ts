import * as XLSX from "xlsx";
import type { RawSheets } from "./types";

export async function parseWorkbook(file: File): Promise<RawSheets> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = (name: string): any[] => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  };
  // procurar folha Super_League em várias formas
  const slNames = ["Super_League", "SuperLeague", "Super League", "Posicoes", "Posições"];
  let superLeague: any[] | undefined;
  for (const n of slNames) {
    if (wb.Sheets[n]) { superLeague = sheet(n); break; }
  }
  return {
    Ranking: sheet("Ranking"),
    Equipas_Pais: sheet("Equipas_Pais"),
    Treinadores: sheet("Treinadores"),
    Jogadores: sheet("Jogadores"),
    Pesos_Fixos: sheet("Pesos_Fixos"),
    Super_League: superLeague,
  };
}

/** Heurística: ficheiro dedicado à Super League (só tem essa folha, ou nome indica). */
export function isSuperLeagueFile(file: File, raw: RawSheets): boolean {
  if (/super.?l(e|i)ga/i.test(file.name)) return true;
  const hasMain = (raw.Ranking?.length ?? 0) > 0;
  const hasSL = (raw.Super_League?.length ?? 0) > 0;
  return !hasMain && hasSL;
}
