import { describe, it, expect } from "vitest";
import { normalizeSeason } from "./engine";

describe("normalizeSeason", () => {
  it("converte campos numéricos com vírgula decimal e mantém Equipa", () => {
    const ns = normalizeSeason(
      {
        Ranking: [
          { Divisao: "1", Pos: "1", Equipa: "Porto", J: "30", GM: "60", GS: "20", DG: "40", Pts: "75", Inf: "C" },
          { Divisao: 1, Pos: 2, Equipa: "Benfica", J: 30, GM: 55, GS: 22, DG: 33, Pts: 72, Inf: "" },
        ],
        Equipas_Pais: [{ Clube: "Porto", Pais: "Portugal" }, { Clube: "Benfica", "País": "Portugal" }],
        Treinadores: [{ Nome: "Mister X", Clube: "Porto", Nac: "PT", Inf: "" }],
        Jogadores: [
          { Nome: "J1", Clube: "Porto", Liga: "Primeira", Ast: 5, Gls: 12, Idade: 22, "Salário": "€10000 p/a", VP: "5M" },
        ],
        Pesos_Fixos: [{ Divisao: 1, Peso: 1 }, { Divisao: 2, Peso: "0,75" }],
      },
      "2024",
    );

    expect(ns.epoca).toBe("2024");
    expect(ns.rankings).toHaveLength(2);
    expect(ns.rankings[0]).toMatchObject({ Divisao: 1, Pos: 1, Equipa: "Porto", Pts: 75 });
    expect(ns.equipasPais.get("Porto")).toBe("Portugal");
    expect(ns.equipasPais.get("Benfica")).toBe("Portugal");
    expect(ns.treinadores).toHaveLength(1);
    expect(ns.jogadores[0].VP).toBe(5_000_000);
    expect(ns.jogadores[0].Salario).toBe(10000);
    expect(ns.pesosFixos.get(1)).toBe(1);
    expect(ns.pesosFixos.get(2)).toBeCloseTo(0.75);
  });

  it("ignora linhas sem Equipa / Nome", () => {
    const ns = normalizeSeason(
      {
        Ranking: [{ Divisao: 1, Pos: 1, Equipa: "", J: 30, GM: 1, GS: 1, DG: 0, Pts: 10 }],
        Equipas_Pais: [],
        Treinadores: [{ Nome: "", Clube: "X" }],
        Jogadores: [{ Nome: "" }],
        Pesos_Fixos: [],
      },
      "2024",
    );
    expect(ns.rankings).toHaveLength(0);
    expect(ns.treinadores).toHaveLength(0);
    expect(ns.jogadores).toHaveLength(0);
  });

  it("tolera folhas em falta sem rebentar", () => {
    const ns = normalizeSeason({} as any, "1999");
    expect(ns.epoca).toBe("1999");
    expect(ns.rankings).toEqual([]);
    expect(ns.equipasPais.size).toBe(0);
    expect(ns.pesosFixos.size).toBe(0);
  });
});
