import { describe, it, expect } from "vitest";
import { computeAll, type NormSeason } from "./engine";
import type { ModoAtivo } from "../types";

function mkSeason(epoca: string, teamPts: Record<string, number>): NormSeason {
  const rankings = Object.entries(teamPts).map(([Equipa, Pts], i) => ({
    Divisao: 1,
    Pos: i + 1,
    Inf: "",
    Equipa,
    J: 30, Vitoria: 0, VP: 0, Penaltis: 0, D: 0, GM: 0, GS: 0, DG: 0,
    Pts,
  }));
  return {
    epoca,
    rankings,
    equipasPais: new Map(Object.keys(teamPts).map((c) => [c, "PT"])),
    treinadores: Object.keys(teamPts).map((c) => ({
      Inf: "", Nome: `Coach ${c}`, Nac: "PT", Clube: c,
    })),
    jogadores: [],
    pesosFixos: new Map([[1, 1]]),
  };
}

const MODO: ModoAtivo = { treinadores: true, jogadores: false } as ModoAtivo;

describe("Posições acumuladas — soma integral de todas as épocas", () => {
  // 8 épocas (mais do que a janela legada de 5) para garantir que nada é truncado
  const teams = ["Alfa", "Bravo", "Charlie"];
  const seasons: NormSeason[] = [
    mkSeason("2017", { Alfa: 70, Bravo: 60, Charlie: 50 }),
    mkSeason("2018", { Alfa: 65, Bravo: 62, Charlie: 55 }),
    mkSeason("2019", { Alfa: 80, Bravo: 58, Charlie: 60 }),
    mkSeason("2020", { Alfa: 72, Bravo: 64, Charlie: 50 }),
    mkSeason("2021", { Alfa: 68, Bravo: 70, Charlie: 52 }),
    mkSeason("2022", { Alfa: 75, Bravo: 66, Charlie: 58 }),
    mkSeason("2023", { Alfa: 81, Bravo: 60, Charlie: 61 }),
    mkSeason("2024", { Alfa: 78, Bravo: 72, Charlie: 64 }),
  ];
  const all = computeAll(seasons, MODO);
  const epochsAsc = seasons.map((s) => s.epoca);

  function rowFor(tableKey: string, entityKey: string, entity: string) {
    const t = all[tableKey];
    expect(t, `tabela ${tableKey} deve existir`).toBeTruthy();
    const row = t.rows.find((r: any) => r[entityKey] === entity);
    expect(row, `linha ${entity} em ${tableKey}`).toBeTruthy();
    return row!;
  }

  it("Posicoes_Pontos_Totais acumula todas as 8 épocas (sem truncar a 5)", () => {
    for (const team of teams) {
      const row = rowFor("Posicoes_Pontos_Totais", "Equipa", team);
      let expected = 0;
      for (const ep of epochsAsc) {
        expected += seasons.find((s) => s.epoca === ep)!.rankings.find((r) => r.Equipa === team)!.Pts;
        expect(row[ep]).toBeCloseTo(+expected.toFixed(3), 3);
      }
      // valor da última época = soma de todas as épocas
      const totalAll = epochsAsc.reduce(
        (acc, ep) => acc + seasons.find((s) => s.epoca === ep)!.rankings.find((r) => r.Equipa === team)!.Pts,
        0,
      );
      expect(row[epochsAsc[epochsAsc.length - 1]]).toBeCloseTo(totalAll, 3);
    }
  });

  it("Posicoes_Coef_Clube_Fixos acumula todas as épocas (soma integral, sem decaimento)", () => {
    const src = all.Coef_Clube_Fixos;
    const cum = all.Posicoes_Coef_Clube_Fixos;
    expect(src).toBeTruthy();
    expect(cum).toBeTruthy();
    for (const team of teams) {
      const srcRow = src.rows.find((r: any) => r.Equipa === team)!;
      const cumRow = cum.rows.find((r: any) => r.Equipa === team)!;
      let expected = 0;
      for (const ep of epochsAsc) {
        expected += Number(srcRow[ep]) || 0;
        expect(cumRow[ep]).toBeCloseTo(+expected.toFixed(3), 3);
      }
    }
  });

  it("Posicoes_Ranking_Treinador_Fixos acumula todas as épocas para cada treinador", () => {
    const src = all.Ranking_Treinador_Fixos;
    const cum = all.Posicoes_Ranking_Treinador_Fixos;
    expect(src).toBeTruthy();
    expect(cum).toBeTruthy();
    for (const team of teams) {
      const coachName = `Coach ${team}`;
      const srcRow = src.rows.find((r: any) => r.Treinador === coachName);
      const cumRow = cum.rows.find((r: any) => r.Treinador === coachName);
      if (!srcRow || !cumRow) continue;
      let expected = 0;
      for (const ep of epochsAsc) {
        expected += Number(srcRow[ep]) || 0;
        expect(cumRow[ep]).toBeCloseTo(+expected.toFixed(3), 3);
      }
    }
  });

  it("cabeçalho das tabelas acumuladas mostra prefixo ≤ <época> e descrição inclui todas as épocas", () => {
    for (const key of [
      "Posicoes_Pontos_Totais",
      "Posicoes_Pontos_Totais_Fixos",
      "Posicoes_Coef_Clube_Fixos",
      "Posicoes_Ranking_Treinador_Fixos",
      "Posicoes_Treinador_Coef_Fixos",
    ]) {
      const t = all[key];
      if (!t) continue;
      const epCols = t.columns.filter((c: any) => epochsAsc.includes(c.key));
      expect(epCols.length).toBe(epochsAsc.length);
      for (const c of epCols) expect((c as any).label.startsWith("≤ ")).toBe(true);
      expect(t.description).toMatch(/Inclui todas as \d+ época/);
      expect(t.description).toContain(`${epochsAsc[0]} → ${epochsAsc[epochsAsc.length - 1]}`);
    }
  });

  it("regressão: nenhuma época além das últimas 5 fica zerada por decaimento", () => {
    // Para Posicoes_Pontos_Totais (Alfa) o valor da época mais antiga deve ser exatamente Pts de 2017
    const row = rowFor("Posicoes_Pontos_Totais", "Equipa", "Alfa");
    expect(row["2017"]).toBe(70);
    // A diferença entre épocas consecutivas deve ser >0 (somatório monotónico crescente)
    for (let i = 1; i < epochsAsc.length; i++) {
      const prev = Number(row[epochsAsc[i - 1]]) || 0;
      const cur = Number(row[epochsAsc[i]]) || 0;
      expect(cur).toBeGreaterThan(prev - 0.001);
    }
  });
});
