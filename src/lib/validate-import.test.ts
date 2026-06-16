import { describe, it, expect } from "vitest";
import { validateRawSheets, summarize } from "./validate-import";

const baseRaw = () => ({
  Ranking: [{ Divisao: 1, Pos: 1, Equipa: "Porto", J: 30, GM: 50, GS: 20, Pts: 70 }],
  Equipas_Pais: [{ Clube: "Porto", Pais: "Portugal" }],
  Treinadores: [{ Nome: "M", Clube: "Porto" }],
  Jogadores: [{ Nome: "J", Clube: "Porto", Liga: "Primeira" }],
  Pesos_Fixos: [{ Divisao: 1, Peso: 1 }],
});

describe("validateRawSheets", () => {
  it("ficheiro válido → 0 erros 0 avisos", () => {
    const v = validateRawSheets(baseRaw() as any, "2024", "ok.xlsx");
    expect(summarize(v)).toEqual({ errors: 0, warnings: 0 });
  });

  it("detecta folha em falta como erro", () => {
    const raw: any = baseRaw();
    delete raw.Ranking;
    const v = validateRawSheets(raw, "2024", "bad.xlsx");
    expect(summarize(v).errors).toBeGreaterThan(0);
    expect(v.issues.some((i) => i.sheet === "Ranking" && i.level === "error")).toBe(true);
  });

  it("detecta campos obrigatórios em falta no Ranking", () => {
    const raw: any = baseRaw();
    raw.Ranking = [{ Divisao: 1, Pos: 1, Equipa: "X" }]; // sem J/GM/GS/Pts
    const v = validateRawSheets(raw, "2024", "x.xlsx");
    expect(summarize(v).errors).toBeGreaterThan(0);
  });

  it("avisa quando há clubes sem país", () => {
    const raw: any = baseRaw();
    raw.Equipas_Pais = [];
    const v = validateRawSheets(raw, "2024", "x.xlsx");
    expect(summarize(v).warnings).toBeGreaterThan(0);
    expect(v.issues.some((i) => i.message.includes("sem país"))).toBe(true);
  });

  it("avisa quando faltam pesos para uma divisão presente", () => {
    const raw: any = baseRaw();
    raw.Ranking.push({ Divisao: 2, Pos: 1, Equipa: "Y", J: 30, GM: 1, GS: 1, Pts: 10 });
    raw.Equipas_Pais.push({ Clube: "Y", Pais: "PT" });
    const v = validateRawSheets(raw, "2024", "x.xlsx");
    expect(v.issues.some((i) => i.sheet === "Pesos_Fixos" && i.level === "warning")).toBe(true);
  });
});
