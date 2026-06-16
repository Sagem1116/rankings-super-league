import { describe, it, expect } from "vitest";
import { computeAll, type NormSeason } from "./engine";
import type { ModoAtivo } from "../types";

function mkSeason(epoca: string, teamPts: Record<string, number>): NormSeason {
  const rankings = Object.entries(teamPts).map(([Equipa, Pts], i) => ({
    Divisao: 1, Pos: i + 1, Inf: "", Equipa,
    J: 30, Vitoria: 0, VP: 0, Penaltis: 0, D: 0, GM: 0, GS: 0, DG: 0,
    Pts,
  }));
  return {
    epoca,
    rankings,
    equipasPais: new Map(Object.keys(teamPts).map((c) => [c, "PT"])),
    treinadores: [],
    jogadores: [],
    pesosFixos: new Map([[1, 1]]),
  };
}

const MODO: ModoAtivo = { rankings: true, treinadores: false, jogadores: false };

describe("computeAll — sanidade geral", () => {
  it("produz tabelas-chave a partir de 2 épocas", () => {
    const r = computeAll(
      [
        mkSeason("2023", { Alfa: 80, Bravo: 70 }),
        mkSeason("2024", { Alfa: 85, Bravo: 65 }),
      ],
      MODO,
    );
    expect(r.Pontos_Totais).toBeTruthy();
    expect(r.Pontos_Totais.rows.find((x: any) => x.Equipa === "Alfa")!.Total).toBe(165);
    expect(r.Pontos_Totais.rows.find((x: any) => x.Equipa === "Bravo")!.Total).toBe(135);
    // épocas presentes como colunas
    const cols = r.Pontos_Totais.columns.map((c: any) => c.key);
    expect(cols).toContain("2023");
    expect(cols).toContain("2024");
  });

  it("não rebenta com zero épocas", () => {
    const r = computeAll([], MODO);
    expect(r).toBeTruthy();
    expect(typeof r).toBe("object");
  });
});
