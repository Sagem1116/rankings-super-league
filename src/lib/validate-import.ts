import type { RawSheets } from "./types";

export interface ImportIssue {
  level: "error" | "warning";
  sheet: string;
  message: string;
  /** Optional row index (1-based, header excluded) for context */
  row?: number;
}

export interface ImportValidation {
  epoca: string;
  fileName: string;
  issues: ImportIssue[];
}

const REQUIRED_SHEETS = ["Ranking", "Equipas_Pais", "Treinadores", "Jogadores", "Pesos_Fixos"] as const;

const RANKING_REQUIRED = ["Divisao", "Pos", "Equipa", "J", "GM", "GS", "Pts"];
const TREINADOR_REQUIRED = ["Nome", "Clube"];
const JOGADOR_REQUIRED = ["Nome", "Clube", "Liga"];

const isEmpty = (v: any) => v === null || v === undefined || String(v).trim() === "";

const hasKey = (row: any, ...keys: string[]) => keys.some((k) => !isEmpty(row?.[k]));

export function validateRawSheets(raw: RawSheets, epoca: string, fileName: string): ImportValidation {
  const issues: ImportIssue[] = [];

  // Se for ficheiro dedicado à Super League (só tem essa folha), validamos só isso.
  const onlySL = (!raw.Ranking || raw.Ranking.length === 0)
    && (raw.Super_League && raw.Super_League.length > 0);

  if (!onlySL) {
    // 1. Folhas em falta / vazias (modo normal)
    for (const s of REQUIRED_SHEETS) {
      const rows = (raw as any)[s];
      if (!rows) {
        issues.push({ level: "error", sheet: s, message: `Folha "${s}" não existe no ficheiro.` });
      } else if (!Array.isArray(rows) || rows.length === 0) {
        issues.push({ level: "warning", sheet: s, message: `Folha "${s}" está vazia.` });
      }
    }
  }

  // 2. Ranking — campos obrigatórios
  const ranking = raw.Ranking || [];
  ranking.forEach((r: any, i: number) => {
    const missing: string[] = [];
    if (!hasKey(r, "Divisao", "Divisão")) missing.push("Divisao");
    if (isEmpty(r.Pos)) missing.push("Pos");
    if (isEmpty(r.Equipa)) missing.push("Equipa");
    if (isEmpty(r.J)) missing.push("J");
    if (isEmpty(r.GM)) missing.push("GM");
    if (isEmpty(r.GS)) missing.push("GS");
    if (isEmpty(r.Pts)) missing.push("Pts");
    if (missing.length) {
      issues.push({
        level: "error",
        sheet: "Ranking",
        row: i + 2,
        message: `Linha ${i + 2} — campos em falta: ${missing.join(", ")} (${r.Equipa ?? "?"})`,
      });
    }
  });

  // 3. Clubes do Ranking sem país em Equipas_Pais
  const clubesPais = new Set<string>(
    (raw.Equipas_Pais || [])
      .map((r: any) => String(r.Clube ?? "").trim())
      .filter(Boolean),
  );
  const clubesRanking = new Set<string>(
    ranking.map((r: any) => String(r.Equipa ?? "").trim()).filter(Boolean),
  );
  const semPais = [...clubesRanking].filter((c) => !clubesPais.has(c));
  if (semPais.length) {
    issues.push({
      level: "warning",
      sheet: "Equipas_Pais",
      message: `${semPais.length} clube(s) do Ranking sem país associado: ${semPais.slice(0, 8).join(", ")}${semPais.length > 8 ? "…" : ""}`,
    });
  }

  // Linhas Equipas_Pais incompletas
  (raw.Equipas_Pais || []).forEach((r: any, i: number) => {
    if (isEmpty(r.Clube) || (isEmpty(r.Pais) && isEmpty(r["País"]))) {
      issues.push({
        level: "warning",
        sheet: "Equipas_Pais",
        row: i + 2,
        message: `Linha ${i + 2} — Clube ou País em branco.`,
      });
    }
  });

  // 4. Treinadores
  (raw.Treinadores || []).forEach((r: any, i: number) => {
    const missing = TREINADOR_REQUIRED.filter((k) => isEmpty(r[k]));
    if (missing.length) {
      issues.push({
        level: "warning",
        sheet: "Treinadores",
        row: i + 2,
        message: `Linha ${i + 2} — campos em falta: ${missing.join(", ")} (${r.Nome ?? "?"})`,
      });
    }
  });

  // 5. Jogadores
  (raw.Jogadores || []).forEach((r: any, i: number) => {
    const missing = JOGADOR_REQUIRED.filter((k) => isEmpty(r[k]));
    if (missing.length) {
      issues.push({
        level: "warning",
        sheet: "Jogadores",
        row: i + 2,
        message: `Linha ${i + 2} — campos em falta: ${missing.join(", ")} (${r.Nome ?? "?"})`,
      });
    }
  });

  // 6. Pesos_Fixos — divisões do Ranking sem peso definido
  const divsRanking = new Set<number>(
    ranking
      .map((r: any) => Number(r.Divisao ?? r["Divisão"]))
      .filter((n: number) => Number.isFinite(n) && n > 0),
  );
  const divsPesos = new Set<number>(
    (raw.Pesos_Fixos || [])
      .map((r: any) => Number(r.Divisao ?? r["Divisão"]))
      .filter((n: number) => Number.isFinite(n) && n > 0),
  );
  const divsSemPeso = [...divsRanking].filter((d) => !divsPesos.has(d));
  if (divsSemPeso.length) {
    issues.push({
      level: "warning",
      sheet: "Pesos_Fixos",
      message: `Divisão(ões) sem peso definido: ${divsSemPeso.sort((a, b) => a - b).join(", ")}`,
    });
  }

  // 7. Super_League (opcional)
  if (raw.Super_League && raw.Super_League.length > 0) {
    raw.Super_League.forEach((r: any, i: number) => {
      const missing: string[] = [];
      if (isEmpty(r.Equipa)) missing.push("Equipa");
      if (isEmpty(r.Pos)) missing.push("Pos");
      if (missing.length) {
        issues.push({
          level: "warning",
          sheet: "Super_League",
          row: i + 2,
          message: `Linha ${i + 2} — campos em falta: ${missing.join(", ")} (${r.Equipa ?? "?"})`,
        });
      }
    });
  }

  return { epoca, fileName, issues };
}

export const summarize = (v: ImportValidation) => {
  const errors = v.issues.filter((i) => i.level === "error").length;
  const warnings = v.issues.filter((i) => i.level === "warning").length;
  return { errors, warnings };
};
