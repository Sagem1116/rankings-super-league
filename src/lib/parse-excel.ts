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
  return {
    Ranking: sheet("Ranking"),
    Equipas_Pais: sheet("Equipas_Pais"),
    Treinadores: sheet("Treinadores"),
    Jogadores: sheet("Jogadores"),
    Pesos_Fixos: sheet("Pesos_Fixos"),
  };
}