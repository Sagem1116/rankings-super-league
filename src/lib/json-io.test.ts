import { describe, it, expect } from "vitest";
import { buildExportPayload, parseImportPayload } from "./json-io";
import type { NormSeason } from "./calc/engine";
import type { RankingTable } from "./types";

const season: NormSeason = {
  epoca: "2024",
  rankings: [{ Divisao: 1, Pos: 1, Inf: "", Equipa: "Porto", J: 30, Vitoria: 0, VP: 0, Penaltis: 0, D: 0, GM: 60, GS: 20, DG: 40, Pts: 75 }],
  equipasPais: new Map([["Porto", "Portugal"]]),
  treinadores: [],
  jogadores: [],
  pesosFixos: new Map([[1, 1]]),
};

const tabela: RankingTable = {
  key: "X", title: "X", category: "Clubes", description: "",
  columns: [{ key: "Equipa", label: "Equipa", type: "text" }],
  rows: [{ Equipa: "Porto" }],
};

describe("json-io round-trip", () => {
  it("export → import preserva épocas, resultados e Maps", () => {
    const payload = buildExportPayload([season], { X: tabela }, "2024", { rankings: true, treinadores: true, jogadores: true });
    const json = JSON.stringify(payload);
    const out = parseImportPayload(json);
    expect(out.seasons).toHaveLength(1);
    expect(out.seasons[0].equipasPais.get("Porto")).toBe("Portugal");
    expect(out.seasons[0].pesosFixos.get(1)).toBe(1);
    expect(out.resultados.X.rows[0].Equipa).toBe("Porto");
    expect(out.ultimaEpoca).toBe("2024");
  });

  it("rejeita JSON com app errada", () => {
    const bad = JSON.stringify({ app: "Outra", version: 1 });
    expect(() => parseImportPayload(bad)).toThrow(/FMDataLab/);
  });

  it("rejeita versão não suportada", () => {
    const bad = JSON.stringify({ app: "FMDataLab", version: 99, seasons: [], resultados: {} });
    expect(() => parseImportPayload(bad)).toThrow(/Versão/);
  });
});
