import { describe, it, expect } from "vitest";
import { filterAndSortRows } from "./table-utils";
import type { ColDef } from "./types";

const cols: ColDef[] = [
  { key: "Equipa", label: "Equipa", type: "text" },
  { key: "Pts", label: "Pts", type: "num" },
];

const rows = [
  { Equipa: "Porto", Pts: 75 },
  { Equipa: "Benfica", Pts: 72 },
  { Equipa: "Sporting", Pts: 68 },
  { Equipa: "Braga", Pts: 60 },
];

describe("filterAndSortRows", () => {
  it("sem filtros nem ordenação devolve as mesmas linhas", () => {
    const r = filterAndSortRows(rows, {}, cols);
    expect(r).toHaveLength(4);
  });

  it("filtra por substring case-insensitive", () => {
    const r = filterAndSortRows(rows, { Equipa: "por" }, cols);
    expect(r.map((x) => x.Equipa)).toEqual(["Porto", "Sporting"]);
  });

  it("ordena numericamente desc por defeito", () => {
    const r = filterAndSortRows(rows, {}, cols, "Pts", "desc");
    expect(r.map((x) => x.Pts)).toEqual([75, 72, 68, 60]);
  });

  it("ordena numericamente asc", () => {
    const r = filterAndSortRows(rows, {}, cols, "Pts", "asc");
    expect(r.map((x) => x.Pts)).toEqual([60, 68, 72, 75]);
  });

  it("ordena texto asc", () => {
    const r = filterAndSortRows(rows, {}, cols, "Equipa", "asc");
    expect(r.map((x) => x.Equipa)).toEqual(["Benfica", "Braga", "Porto", "Sporting"]);
  });

  it("combina filtro + ordenação", () => {
    const r = filterAndSortRows(rows, { Equipa: "o" }, cols, "Pts", "desc");
    expect(r.map((x) => x.Equipa)).toEqual(["Porto", "Sporting"]);
  });

  it("filtro não-correspondente devolve vazio", () => {
    expect(filterAndSortRows(rows, { Equipa: "xyz" }, cols)).toHaveLength(0);
  });
});
