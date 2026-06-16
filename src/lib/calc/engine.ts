import type { ColDef, RankingTable, RawSheets, SeasonData, ModoAtivo } from "../types";

/* -------------------------------- helpers -------------------------------- */
const JOGOS_DIV: Record<number, number> = {
  1: 180, 2: 600, 3: 600, 4: 600, 5: 600, 6: 600, 7: 600, 8: 600, 9: 600, 10: 600, 11: 700,
};
const COEF_WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2];
function getCoefWeight(i_from_recent: number): number { return Math.max(0, 1.0 - i_from_recent * 0.2); }

const num = (v: any, def = 0): number => {
  if (v === null || v === undefined || v === "") return def;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
};
const int = (v: any, def = 0): number => Math.trunc(num(v, def));
const txt = (v: any): string => (v === null || v === undefined ? "" : String(v).trim());

/** Parse Inf field into exact tokens (e.g. "C", "P", "D", "PO"). Avoids false positives like /P/ matching "PO". */
function infTokens(inf: string): Set<string> {
  if (!inf) return new Set();
  return new Set(
    String(inf)
      .toUpperCase()
      .split(/[\s,;/|+]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}
const isC = (inf: string) => infTokens(inf).has("C");
const isP = (inf: string) => infTokens(inf).has("P");
const isD = (inf: string) => infTokens(inf).has("D");

function parseSalario(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/€/g, "").replace(/p\/?\s*a/gi, "").replace(/\s/g, "")
    .replace(/,/g, "").trim();
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function parseVP(v: any): number {
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/€/g, "").replace(/\s/g, "").trim();
  if (!s) return 0;
  let mult = 1;
  if (s.endsWith("M")) { mult = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith("m") || s.endsWith("k") || s.endsWith("K")) { mult = 1_000; s = s.slice(0, -1); }
  s = s.replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n * mult : 0;
}

const stdev = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

const pearsonCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  let num = 0; let denomX = 0; let denomY = 0;
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  return denomX && denomY ? num / Math.sqrt(denomX * denomY) : 0;
};

/* -------------------- season normalization & merging -------------------- */
export interface NormSeason {
  epoca: string;
  rankings: Array<{
    Divisao: number; Pos: number; Inf: string; Equipa: string; J: number;
    Vitoria: number; VP: number; Penaltis: number; D: number; GM: number; GS: number; DG: number; Pts: number;
    EquipaUID?: string;
  }>;
  equipasPais: Map<string, string>; // Clube -> Pais
  treinadores: Array<{ Inf: string; Nome: string; Nac: string; Clube: string; ClubeUID?: string }>;
  jogadores: Array<{
    IDU: string; Rec: string; Inf: string; Nome: string; Liga: string; Clube: string;
    Ast: number; Gls: number; Idade: number; Salario: number;
    RA: number; RM: number; CA: number; CP: number; VP: number;
    ClubeUID?: string;
  }>;
  pesosFixos: Map<number, number>;
  superLeague?: Array<{ Equipa: string; Treinador: string; Pos: number; Inf: string; Pts: number }>;
}

export function normalizeSeason(raw: RawSheets, epoca: string): NormSeason {
  const rankings = (raw.Ranking || []).map((r: any) => ({
    Divisao: int(r.Divisao ?? r.Divisão),
    Pos: int(r.Pos),
    Inf: txt(r.Inf),
    Equipa: txt(r.Equipa),
    EquipaUID: txt(r.EquipaUID ?? r.UID) || undefined,
    J: int(r.J),
    Vitoria: num(r["Vitória"] ?? r.Vitoria),
    VP: num(r.VP),
    Penaltis: num(r["Penáltis"] ?? r.Penaltis),
    D: num(r.D),
    GM: num(r.GM),
    GS: num(r.GS),
    DG: num(r.DG),
    Pts: num(r.Pts),
  })).filter((r: any) => r.Equipa);

  const equipasPais = new Map<string, string>();
  for (const r of raw.Equipas_Pais || []) {
    const c = txt(r.Clube); const p = txt(r.Pais ?? r["País"]);
    if (c) equipasPais.set(c, p);
  }

  const treinadores = (raw.Treinadores || []).map((r: any) => ({
    Inf: txt(r.Inf), Nome: txt(r.Nome), Nac: txt(r.Nac), Clube: txt(r.Clube),
    ClubeUID: txt(r.ClubeUID ?? r.UID) || undefined,
  })).filter((r: any) => r.Nome);

  const jogadores = (raw.Jogadores || []).map((r: any) => ({
    IDU: txt(r.IDU), Rec: txt(r.Rec), Inf: txt(r.Inf), Nome: txt(r.Nome),
    Liga: txt(r.Liga), Clube: txt(r.Clube),
    ClubeUID: txt(r.ClubeUID ?? r.UID) || undefined,
    Ast: num(r.Ast), Gls: num(r.Gls), Idade: num(r.Idade),
    Salario: parseSalario(r["Salário"] ?? r.Salario),
    RA: num(r["R.A."] ?? r.RA), RM: num(r.RM),
    CA: num(r["C.A."] ?? r.CA), CP: num(r["C.P."] ?? r.CP),
    VP: parseVP(r.VP),
  })).filter((r: any) => r.Nome);

  const pesosFixos = new Map<number, number>();
  for (const r of raw.Pesos_Fixos || []) {
    const d = int(r.Divisao ?? r.Divisão); const p = num(r.Peso);
    if (d) pesosFixos.set(d, p);
  }

  return { epoca, rankings, equipasPais, treinadores, jogadores, pesosFixos };
}

/* -------------------- build all tables given seasons --------------------- */

export function computeAll(
  seasons: NormSeason[],
  modo: ModoAtivo,
): Record<string, RankingTable> {
  const out: Record<string, RankingTable> = {};
  const epochs = seasons.map((s) => s.epoca).sort();
  const epColsBase: ColDef[] = epochs.map((e) => ({ key: e, label: e, type: "num", decimals: 0 }));

  /* index tables once */
  const seasonByEp = new Map(seasons.map((s) => [s.epoca, s]));

  // Equipa -> Divisao for latest season (used for Muralha)
  const lastEp = epochs[epochs.length - 1];
  const lastSeason = lastEp ? seasonByEp.get(lastEp)! : null;


  /* ============================== Pontos_Totais ========================== */
  {
    const map = new Map<string, Record<string, any>>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || { Equipa: r.Equipa, _div: r.Divisao, _pais: s.equipasPais.get(r.Equipa) || "" };
        row[s.epoca] = r.Pts;
        row[`__pos_${s.epoca}`] = r.Pos;
        row[`__div_${s.epoca}`] = r.Divisao;
        row[`__inf_${s.epoca}`] = r.Inf;
        row._div = r.Divisao;
        row._pais = row._pais || s.equipasPais.get(r.Equipa) || "";
        map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let tot = 0, n = 0;
      for (const e of epochs) if (typeof r[e] === "number") { tot += r[e]; n++; }
      r.Total = tot;
      r.Media = n ? +(tot / n).toFixed(2) : 0;
      return r;
    });
    out.Pontos_Totais = {
      key: "Pontos_Totais", title: "Pontos Totais", category: "Clubes",
      description: "Soma de Pts por época por equipa.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epColsBase,
        { key: "Total", label: "Total", type: "num" },
        { key: "Media", label: "Média", type: "num", decimals: 2 },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Equipa", epochKeys: epochs,
    };

    out.Evolucao_Pontos_Totais = {
      key: "Evolucao_Pontos_Totais", title: "Evolução Pontos Totais", category: "Clubes",
      description: "Evolução de pontos por época com variações ano a ano.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const })),
        ...epochs.slice(1).map((e) => ({ key: `Δ${e}`, label: `Δ ${e}`, type: "num" as const })),
        { key: "Total", label: "Total", type: "num" },
      ],
      rows: rows.map((r) => ({
        ...r,
        ...epochs.slice(1).reduce((acc, e, idx) => {
          const prev = Number(r[epochs[idx]]) || 0;
          const current = Number(r[e]) || 0;
          acc[`Δ${e}`] = +((current - prev).toFixed(0));
          return acc;
        }, {} as Record<string, number>),
      })),
      sortKey: "Total",
      sortDir: "desc",
      entityKey: "Equipa",
      epochKeys: epochs,
    };
  }

  /* ============================ Stats_Divisoes =========================== */
  {
    const rows: any[] = [];
    for (let div = 1; div <= 11; div++) {
      const allPts: number[] = [], allGM: number[] = [], allDG: number[] = [];
      let GM = 0, DG = 0, jogos = 0;
      for (const s of seasons) {
        const team = s.rankings.filter((r) => r.Divisao === div);
        for (const r of team) {
          allPts.push(r.Pts); allGM.push(r.GM); allDG.push(r.DG);
          GM += r.GM; DG += Math.abs(r.DG);
        }
        jogos += JOGOS_DIV[div] * (team.length > 0 ? 1 : 0);
      }
      if (allPts.length === 0) continue;
      const desvio = stdev(allPts);
      const j = jogos || JOGOS_DIV[div];
      const forca = (GM / j) * 0.4 + (DG / j) * 0.4 + desvio * 0.2;
      const comp = (1 / (desvio + 1)) * (DG / j);
      rows.push({
        Divisao: div,
        Desvio: +desvio.toFixed(3),
        GM, DG,
        "GM/jogo": +(GM / j).toFixed(3),
        "DG/jogo": +(DG / j).toFixed(3),
        Forca: +forca.toFixed(4),
        Comp: +comp.toFixed(4),
      });
    }
    out.Stats_Divisoes = {
      key: "Stats_Divisoes", title: "Stats por Divisão", category: "Divisões",
      description: "Estatísticas agregadas por divisão.",
      columns: [
        { key: "Divisao", label: "Divisão", type: "int" },
        { key: "Desvio", label: "Desvio Pts", type: "num", decimals: 3 },
        { key: "GM", label: "GM total", type: "num" },
        { key: "DG", label: "|DG| total", type: "num" },
        { key: "GM/jogo", label: "GM/jogo", type: "num", decimals: 3 },
        { key: "DG/jogo", label: "DG/jogo", type: "num", decimals: 3 },
        { key: "Forca", label: "Força", type: "num", decimals: 4 },
        { key: "Comp", label: "Competitividade", type: "num", decimals: 4 },
      ],
      rows, sortKey: "Forca", sortDir: "desc",
    };
  }

  /* =========================== Pesos_Dinamicos =========================== */
  const pesosDinamicos = new Map<number, number>();
  {
    const rows: any[] = [];
    for (const r of out.Stats_Divisoes.rows) {
      const f = Number(r.Forca) || 0;
      const c = Number(r.Comp) || 0;
      const peso = +(f * 0.7 + c * 0.3).toFixed(4);
      pesosDinamicos.set(r.Divisao as number, peso);
      rows.push({ Divisao: r.Divisao, Peso: peso, Forca: r.Forca, Comp: r.Comp });
    }
    out.Pesos_Dinamicos = {
      key: "Pesos_Dinamicos", title: "Pesos Dinâmicos", category: "Divisões",
      description: "Peso por divisão = Força*0.7 + Comp*0.3.",
      columns: [
        { key: "Divisao", label: "Divisão", type: "int" },
        { key: "Peso", label: "Peso", type: "num", decimals: 4 },
        { key: "Forca", label: "Força", type: "num", decimals: 4 },
        { key: "Comp", label: "Comp", type: "num", decimals: 4 },
      ],
      rows, sortKey: "Peso", sortDir: "desc",
    };
  }

  /* ===================== Pontos Totais (Fixos / Dinâmicos) ================ */
  function buildWeighted(weightFor: (div: number) => number, key: string, title: string) {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const w = weightFor(r.Divisao) || 0;
        const v = +(r.Pts * w).toFixed(3);
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = v;
        row[`__pos_${s.epoca}`] = r.Pos;
        row[`__div_${s.epoca}`] = r.Divisao;
        row[`__inf_${s.epoca}`] = r.Inf;
        map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let t = 0; for (const e of epochs) if (typeof r[e] === "number") t += r[e];
      r.Total = +t.toFixed(3); return r;
    });
    out[key] = {
      key, title, category: "Clubes",
      description: title,
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2 })),
        { key: "Total", label: "Total", type: "num", decimals: 2 },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Equipa", epochKeys: epochs,
    };
  }
  buildWeighted((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Pontos_Totais_Fixos", "Pontos Totais (Fixos)");
  buildWeighted((d) => pesosDinamicos.get(d) ?? 1, "Pontos_Totais_Dinamicos", "Pontos Totais (Dinâmicos)");

  /* ============================ Coef de Clube ============================= */
  function bonusFor(inf: string, pos: number, divisao: number): number {
    let b = 0;
    if (isC(inf)) b += 10;
    if (isP(inf)) b += 4;
    if (pos >= 2 && pos <= 5) b += 3;
    return b;
  }

  function buildCoefClube(weightFor: (div: number) => number, key: string, title: string) {
    const teams = new Map<string, Map<string, { v: number; pts: number; w: number; bonus: number; div: number; pos: number; inf: string }>>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const w = weightFor(r.Divisao) || 1;
        const bonus = bonusFor(r.Inf, r.Pos, r.Divisao);
        const v = r.Pts * w + bonus;
        if (!teams.has(r.Equipa)) teams.set(r.Equipa, new Map());
        teams.get(r.Equipa)!.set(s.epoca, { v, pts: r.Pts, w, bonus, div: r.Divisao, pos: r.Pos, inf: r.Inf });
      }
    }
    const allEpochs = [...epochs].reverse(); // most recent first, ALL
    const last5 = epochs.slice(-5).reverse(); // for Coef calculation
    const rows: any[] = [];
    for (const [team, byEp] of teams) {
      let coef = 0;
      const row: any = { Equipa: team };
      allEpochs.forEach((e) => {
        const d = byEp.get(e);
        const v = d?.v ?? 0;
        row[e] = +v.toFixed(2);
        const last5Idx = last5.indexOf(e);
        if (last5Idx >= 0) {
          row[`__tip_${e}`] = d
            ? `${e}: Pts ${d.pts} × peso ${d.w.toFixed(2)} + bónus ${d.bonus} = ${v.toFixed(2)} × ${COEF_WEIGHTS[last5Idx]} (peso temporal) → ${(v * COEF_WEIGHTS[last5Idx]).toFixed(2)}`
            : `${e}: sem dados (0 × ${COEF_WEIGHTS[last5Idx]})`;
        } else {
          row[`__tip_${e}`] = d
            ? `${e}: Pts ${d.pts} × peso ${d.w.toFixed(2)} + bónus ${d.bonus} = ${v.toFixed(2)} (fora da janela do coef)`
            : `${e}: sem dados`;
        }
      });
      last5.forEach((e, i) => {
        const v = byEp.get(e)?.v ?? 0;
        coef += v * COEF_WEIGHTS[i];
      });
      row.Coef = +coef.toFixed(3);
      rows.push(row);
    }
    allEpochs.forEach((e) => {
      const sorted = [...rows].sort((a, b) => (b[e] ?? 0) - (a[e] ?? 0));
      sorted.forEach((row, pos) => {
        row[`__pos_${e}`] = pos + 1;
      });
    });
    out[key] = {
      key, title, category: "Clubes", description: title,
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...allEpochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2, tooltipKey: `__tip_${e}` })),
        { key: "Coef", label: "Coef", type: "num", decimals: 3 },
      ],
      rows, sortKey: "Coef", sortDir: "desc", entityKey: "Equipa", epochKeys: allEpochs,
    };
  }
  buildCoefClube(() => 1, "Coef_Clube", "Coeficiente de Clube");
  buildCoefClube((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Coef_Clube_Fixos", "Coef. Clube (Fixos)");
  buildCoefClube((d) => pesosDinamicos.get(d) ?? 1, "Coef_Clube_Dinamicos", "Coef. Clube (Dinâmicos)");

  /* ====== Posições Geral - Coef Clube Fixos (extract cumulative values) ======== */
  {
    const source = out.Coef_Clube_Fixos;
    if (source && source.epochKeys) {
      const allEpochs = source.epochKeys;
      const cumulativeEpochs = [...allEpochs].sort((a, b) => String(a).localeCompare(String(b))); // chronological ascending
      const epRange = cumulativeEpochs.length
        ? `${cumulativeEpochs[0]} → ${cumulativeEpochs[cumulativeEpochs.length - 1]}`
        : "—";

      const cumulativeRows = source.rows.map((r) => {
        const row: any = { Equipa: r.Equipa };
        let cumulativeCoef = 0;
        cumulativeEpochs.forEach((e, i) => {
          const v = Number(r[e]) || 0;
          cumulativeCoef += v;
          row[e] = +cumulativeCoef.toFixed(3);
          row[`__tip_${e}`] = `Soma integral de ${i + 1} época(s): ${cumulativeEpochs
            .slice(0, i + 1)
            .join(" + ")} = ${cumulativeCoef.toFixed(3)}`;
        });
        return row;
      });

      allEpochs.forEach((e) => {
        const sorted = [...cumulativeRows].sort((a, b) => (b[e] ?? 0) - (a[e] ?? 0));
        sorted.forEach((row, pos) => {
          row[`__pos_${e}`] = pos + 1;
          row[`__tip_${e}`] = `${row[`__tip_${e}`] || ""}  ·  Posição acumulada: #${pos + 1}`;
        });
      });

      out.Posicoes_Coef_Clube_Fixos = {
        key: "Posicoes_Coef_Clube_Fixos",
        title: "Coef. Clube (Fixos) - Valores Acumulados",
        category: "Posições Geral",
        description: `Soma integral do Coef. Clube (Fixos) — inclui todas as ${cumulativeEpochs.length} época(s) disponíveis (${epRange}). Cada coluna mostra o acumulado desde a primeira época até essa coluna (sem janela de 5 anos).`,
        columns: [
          { key: "Equipa", label: "Equipa", type: "text" },
          ...allEpochs.map((e) => ({ key: e, label: `≤ ${e}`, type: "num" as const, decimals: 3, tooltipKey: `__tip_${e}` })),
        ],
        rows: cumulativeRows,
        sortKey: allEpochs[0], // sort by most recent cumulative value
        sortDir: "desc",
        entityKey: "Equipa",
        epochKeys: allEpochs,
      };
    }
  }


  /* ============================== Países ================================== */
  function aggregateBy<K>(
    keyFor: (s: NormSeason, r: NormSeason["rankings"][number]) => string | null,
    valueFor: (s: NormSeason, r: NormSeason["rankings"][number]) => number,
    aggregator: "sum" | "mean" = "sum",
  ) {
    const map = new Map<string, Record<string, { sum: number; count: number }>>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const k = keyFor(s, r); if (!k) continue;
        if (!map.has(k)) map.set(k, {});
        const entry = map.get(k)!;
        const cell = entry[s.epoca] || { sum: 0, count: 0 };
        cell.sum += valueFor(s, r); cell.count++;
        entry[s.epoca] = cell;
      }
    }
    return [...map.entries()].map(([k, byEp]) => {
      const row: any = { _key: k };
      let tot = 0, n = 0;
      for (const e of epochs) {
        const c = byEp[e];
        if (!c) continue;
        const v = aggregator === "mean" ? c.sum / c.count : c.sum;
        row[e] = +v.toFixed(2);
        tot += v; n++;
      }
      row.Total = +tot.toFixed(2);
      row.Media = n ? +(tot / n).toFixed(2) : 0;
      return row;
    });
  }

  {
    const rows = aggregateBy(
      (s, r) => s.equipasPais.get(r.Equipa) || null,
      (_s, r) => r.Pts,
    ).map((r) => ({ Pais: r._key, ...r }));
    out.Pontos_Total_Pais = {
      key: "Pontos_Total_Pais", title: "Pontos Total (Países)", category: "Países",
      description: "Soma de Pts por país por época.",
      columns: [
        { key: "Pais", label: "País", type: "text" },
        ...epColsBase, { key: "Total", label: "Total", type: "num" },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Pais", epochKeys: epochs,
    };
    const meanRows = aggregateBy(
      (s, r) => s.equipasPais.get(r.Equipa) || null,
      (_s, r) => r.Pts, "mean",
    ).map((r) => ({ Pais: r._key, ...r }));
    out.Pontos_Media_Pais = {
      key: "Pontos_Media_Pais", title: "Pontos Média (Países)", category: "Países",
      description: "Média de Pts por país por época.",
      columns: [
        { key: "Pais", label: "País", type: "text" },
        ...epColsBase, { key: "Media", label: "Média", type: "num", decimals: 2 },
      ],
      rows: meanRows, sortKey: "Media", sortDir: "desc", entityKey: "Pais", epochKeys: epochs,
    };
  }

  function buildCoefPaises(weightFor: (div: number) => number, key: string, title: string) {
    const allEpochs = [...epochs].reverse();
    const last5 = epochs.slice(-5).reverse();
    const map = new Map<string, Map<string, number>>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const pais = s.equipasPais.get(r.Equipa); if (!pais) continue;
        const w = weightFor(r.Divisao) || 1;
        const v = r.Pts * w + bonusFor(r.Inf, r.Pos, r.Divisao);
        if (!map.has(pais)) map.set(pais, new Map());
        const m = map.get(pais)!;
        m.set(s.epoca, (m.get(s.epoca) || 0) + v);
      }
    }
    const rows: any[] = [];
    for (const [pais, byEp] of map) {
      let coef = 0; const row: any = { Pais: pais };
      allEpochs.forEach((e) => {
        const v = byEp.get(e) ?? 0; row[e] = +v.toFixed(2);
        const last5Idx = last5.indexOf(e);
        if (last5Idx >= 0) {
          coef += v * COEF_WEIGHTS[last5Idx];
          row[`__tip_${e}`] = `${e}: soma ${v.toFixed(2)} × ${COEF_WEIGHTS[last5Idx]} (peso temporal) → ${(v * COEF_WEIGHTS[last5Idx]).toFixed(2)}`;
        } else {
          row[`__tip_${e}`] = `${e}: soma ${v.toFixed(2)} (fora da janela do coef)`;
        }
      });
      row.Coef = +coef.toFixed(3); rows.push(row);
    }
    allEpochs.forEach((e) => {
      const sorted = [...rows].sort((a, b) => (b[e] ?? 0) - (a[e] ?? 0));
      sorted.forEach((row, pos) => {
        row[`__pos_${e}`] = pos + 1;
      });
    });
    out[key] = {
      key, title, category: "Países", description: title,
      columns: [
        { key: "Pais", label: "País", type: "text" },
        ...allEpochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2, tooltipKey: `__tip_${e}` })),
        { key: "Coef", label: "Coef", type: "num", decimals: 3 },
      ],
      rows, sortKey: "Coef", sortDir: "desc", entityKey: "Pais", epochKeys: allEpochs,
    };
  }
  buildCoefPaises(() => 1, "Coef_Paises", "Coef. Países");
  buildCoefPaises((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Coef_Paises_Fixo", "Coef. Países (Fixos)");
  buildCoefPaises((d) => pesosDinamicos.get(d) ?? 1, "Coef_Paises_Dinamico", "Coef. Países (Dinâmicos)");

  /* ============================ Underdogs ================================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const eff = r.Pts / (r.GM + 1);
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = +eff.toFixed(3);
        map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let s = 0, n = 0;
      for (const e of epochs) if (typeof r[e] === "number") { s += r[e]; n++; }
      r.Media = n ? +(s / n).toFixed(3) : 0; return r;
    });
    out.Ranking_Underdogs = {
      key: "Ranking_Underdogs", title: "Ranking Underdogs", category: "Rankings Especiais",
      description: "Eficiência: Pts / (GM + 1).",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 3 })),
        { key: "Media", label: "Média", type: "num", decimals: 3 },
      ],
      rows, sortKey: "Media", sortDir: "desc", entityKey: "Equipa", epochKeys: epochs,
    };
  }

  /* ============================ Rising Stars =============================== */
  {
    const last3 = epochs.slice(-3);
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = r.Pts; map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      const [e3, e2, e1] = last3; // e1 = newest
      const v1 = num(r[e1]), v2 = num(r[e2]), v3 = num(r[e3]);
      r.Crescimento = +((v1 - v2) + (v2 - v3)).toFixed(2);
      return r;
    });
    out.Rising_Stars = {
      key: "Rising_Stars", title: "Rising Stars", category: "Rankings Especiais",
      description: "Crescimento: (v1-v2) + (v2-v3).",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...last3.map((e) => ({ key: e, label: e, type: "num" as const })),
        { key: "Crescimento", label: "Crescimento", type: "num", decimals: 2 },
      ],
      rows, sortKey: "Crescimento", sortDir: "desc", entityKey: "Equipa", epochKeys: last3,
    };
  }

  /* ============================== Muralha ================================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const j = JOGOS_DIV[r.Divisao] || 600;
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = +(r.GS / j).toFixed(4); map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let s = 0, n = 0;
      for (const e of epochs) if (typeof r[e] === "number") { s += r[e]; n++; }
      r.Media = n ? +(s / n).toFixed(4) : 0; return r;
    });
    out.Ranking_Muralha = {
      key: "Ranking_Muralha", title: "Ranking Muralha", category: "Rankings Especiais",
      description: "GS / jogos da divisão (mais baixo = melhor).",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 4 })),
        { key: "Media", label: "Média", type: "num", decimals: 4 },
      ],
      rows, sortKey: "Media", sortDir: "asc", entityKey: "Equipa", epochKeys: epochs,
    };
  }

  /* ============================ Rolo Compressor ============================ */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const v = r.DG / (r.Pts + 1);
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = +v.toFixed(3); map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let s = 0, n = 0;
      for (const e of epochs) if (typeof r[e] === "number") { s += r[e]; n++; }
      r.Media = n ? +(s / n).toFixed(3) : 0; return r;
    });
    out.Ranking_Rolo_Compressor = {
      key: "Ranking_Rolo_Compressor", title: "Rolo Compressor", category: "Rankings Especiais",
      description: "DG / (Pts + 1).",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 3 })),
        { key: "Media", label: "Média", type: "num", decimals: 3 },
      ],
      rows, sortKey: "Media", sortDir: "desc", entityKey: "Equipa", epochKeys: epochs,
    };
  }

  /* ============================ Golos Marcados/Sofridos ==================== */
  function buildGM(field: "GM" | "GS", key: string, title: string, dir: "asc" | "desc") {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        row[s.epoca] = r[field]; map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => {
      let t = 0; for (const e of epochs) if (typeof r[e] === "number") t += r[e]; r.Total = t; return r;
    });
    out[key] = {
      key, title, category: "Golos", description: title,
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "num" as const })),
        { key: "Total", label: "Total", type: "num" },
      ],
      rows, sortKey: "Total", sortDir: dir, entityKey: "Equipa", epochKeys: epochs,
    };
  }
  buildGM("GM", "Golos_Marcados", "Golos Marcados", "desc");
  buildGM("GS", "Golos_Sofridos", "Golos Sofridos", "asc");

  /* ======================= Comparador de Clubes =========================== */
  {
    const source = out.Pontos_Totais;
    const fixed = out.Pontos_Totais_Fixos;
    const coef = out.Coef_Clube;
    const coefFix = out.Coef_Clube_Fixos;
    const gols = out.Golos_Marcados;
    const gs = out.Golos_Sofridos;
    const rows: any[] = [];
    for (const row of source.rows) {
      const totalFixos = fixed?.rows.find((r: any) => r.Equipa === row.Equipa)?.Total ?? 0;
      const coefValue = coef?.rows.find((r: any) => r.Equipa === row.Equipa)?.Coef ?? 0;
      const coefFixValue = coefFix?.rows.find((r: any) => r.Equipa === row.Equipa)?.Coef ?? 0;
      const golsValue = gols?.rows.find((r: any) => r.Equipa === row.Equipa)?.Total ?? 0;
      const gsValue = gs?.rows.find((r: any) => r.Equipa === row.Equipa)?.Total ?? 0;
      rows.push({
        Equipa: row.Equipa,
        TotalPts: row.Total,
        TotalPtsFixos: totalFixos,
        Diferenca: +(Number(row.Total ?? 0) - Number(totalFixos)).toFixed(2),
        Coef: coefValue,
        CoefFixos: coefFixValue,
        Golos: golsValue,
        GolosSofridos: gsValue,
        DiferencaGols: +(Number(golsValue) - Number(gsValue)).toFixed(0),
      });
    }
    out.Comparador_Clubes = {
      key: "Comparador_Clubes", title: "Comparador de Clubes", category: "Clubes",
      description: "Comparação lado a lado dos principais indicadores de clubes.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        { key: "TotalPts", label: "Pts Total", type: "num", decimals: 2 },
        { key: "TotalPtsFixos", label: "Pts Fixos", type: "num", decimals: 2 },
        { key: "Diferenca", label: "Dif. Pts", type: "num", decimals: 2 },
        { key: "Coef", label: "Coef", type: "num", decimals: 3 },
        { key: "CoefFixos", label: "Coef. Fixos", type: "num", decimals: 3 },
        { key: "Golos", label: "Golos Marcados", type: "num" },
        { key: "GolosSofridos", label: "Golos Sofridos", type: "num" },
        { key: "DiferencaGols", label: "Dif. Golos", type: "num" },
      ],
      rows,
      sortKey: "TotalPts",
      sortDir: "desc",
      entityKey: "Equipa",
    };
  }

  /* ============================== Campeoes ================================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || {
          Equipa: r.Equipa, C: 0, P: 0, D: 0,
          _C: [] as string[], _P: [] as string[], _D: [] as string[],
        };
        if (isC(r.Inf)) { row.C++; row._C.push(`${s.epoca} (Div ${r.Divisao})`); }
        if (isP(r.Inf)) { row.P++; row._P.push(`${s.epoca} (Div ${r.Divisao})`); }
        if (isD(r.Inf)) { row.D++; row._D.push(`${s.epoca} (Div ${r.Divisao})`); }
        map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => ({
      ...r,
      Total: r.C * 3 + r.P * 1 - r.D,
      __tip_C: r._C.length ? `Campeão em: ${r._C.join(", ")}` : "",
      __tip_P: r._P.length ? `Promovido em: ${r._P.join(", ")}` : "",
      __tip_D: r._D.length ? `Despromovido em: ${r._D.join(", ")}` : "",
    }));
    out.Campeoes = {
      key: "Campeoes", title: "Histórico de Campeões", category: "Clubes",
      description: "C / P / D por equipa.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        { key: "C", label: "Campeão", type: "int", tooltipKey: "__tip_C" },
        { key: "P", label: "Promovido", type: "int", tooltipKey: "__tip_P" },
        { key: "D", label: "Despromovido", type: "int", tooltipKey: "__tip_D" },
        { key: "Total", label: "Score", type: "num" },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Equipa",
    };
  }

  /* =========================== Play_Off_Clubes ============================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || {
          Equipa: r.Equipa, QuaseSubida: 0, QuaseTitulo: 0,
          _QS: [] as string[], _QT: [] as string[],
        };
        if (r.Divisao > 1 && r.Pos >= 2 && r.Pos <= 5 && !isP(r.Inf)) {
          row.QuaseSubida++; row._QS.push(`${s.epoca} (Div ${r.Divisao}, ${r.Pos}º)`);
        }
        if (r.Divisao === 1 && r.Pos >= 1 && r.Pos <= 2 && !isC(r.Inf)) {
          row.QuaseTitulo++; row._QT.push(`${s.epoca} (${r.Pos}º)`);
        }
        map.set(r.Equipa, row);
      }
    }
    const rows = [...map.values()].map((r) => ({
      ...r,
      Total: r.QuaseSubida + r.QuaseTitulo,
      __tip_QS: r._QS.length ? `Quase-subida em: ${r._QS.join(", ")}` : "",
      __tip_QT: r._QT.length ? `Quase-título em: ${r._QT.join(", ")}` : "",
    }))
      .filter((r) => r.Total > 0);
    out.Play_Off_Clubes = {
      key: "Play_Off_Clubes", title: "Play-Off Clubes", category: "Clubes",
      description: "Quase-subida e quase-título.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        { key: "QuaseSubida", label: "Quase Subida", type: "int", tooltipKey: "__tip_QS" },
        { key: "QuaseTitulo", label: "Quase Título", type: "int", tooltipKey: "__tip_QT" },
        { key: "Total", label: "Total", type: "int" },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Equipa",
    };
  }

  /* ============================ Registo_Posicoes =========================== */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const row = map.get(r.Equipa) || { Equipa: r.Equipa };
        const tag = r.Inf ? `${r.Pos}${r.Inf}` : `${r.Pos}`;
        row[s.epoca] = tag; map.set(r.Equipa, row);
      }
    }
    out.Registo_Posicoes = {
      key: "Registo_Posicoes", title: "Registo de Posições", category: "Clubes",
      description: "Posição final por equipa por época.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "text" as const })),
      ],
      rows: [...map.values()], sortKey: "Equipa", sortDir: "asc", entityKey: "Equipa",
    };
  }

  /* ======================== Ranking de Tendência ========================== */
  {
    const rows: any[] = [];
    for (const r of out.Registo_Posicoes.rows) {
      const firstEpoch = epochs[0];
      const lastEpoch = epochs[epochs.length - 1];
      const firstPos = Number(String(r[firstEpoch]).replace(/[^0-9]/g, "")) || 0;
      const lastPos = Number(String(r[lastEpoch]).replace(/[^0-9]/g, "")) || 0;
      const trend = lastPos && firstPos ? firstPos - lastPos : 0;
      rows.push({
        Equipa: r.Equipa,
        Inicio: firstPos || undefined,
        Atual: lastPos || undefined,
        Mudanca: trend,
        Tendencia: trend > 0 ? "Melhora" : trend < 0 ? "Piora" : "Estável",
        ...epochs.reduce((acc, e) => ({ ...acc, [e]: r[e] }), {} as Record<string, any>),
      });
    }
    out.Ranking_Tendencia = {
      key: "Ranking_Tendencia", title: "Tendência de Ranking", category: "Posições Geral",
      description: "Mudança de posição por equipa ao longo das épocas.",
      columns: [
        { key: "Equipa", label: "Equipa", type: "text" },
        { key: "Inicio", label: "Posição Inicial", type: "int" },
        { key: "Atual", label: "Posição Atual", type: "int" },
        { key: "Mudanca", label: "Δ Posição", type: "num" },
        { key: "Tendencia", label: "Tendência", type: "text" },
        ...epochs.map((e) => ({ key: e, label: e, type: "text" as const })),
      ],
      rows,
      sortKey: "Mudanca",
      sortDir: "desc",
      entityKey: "Equipa",
    };
  }

  /* ============================ Resumo_Competicao =========================== */
  {
    const rows: any[] = [];
    for (const s of seasons) {
      const totalPts = s.rankings.reduce((sum, r) => sum + r.Pts, 0);
      const totalGols = s.rankings.reduce((sum, r) => sum + r.GM, 0);
      const totalSofridos = s.rankings.reduce((sum, r) => sum + r.GS, 0);
      const campeao = s.rankings.find((r) => isC(r.Inf))?.Equipa || "-";
      const promovidos = s.rankings.filter((r) => isP(r.Inf)).length;
      rows.push({
        Epoca: s.epoca,
        TotalPts: totalPts,
        AvgPts: +(totalPts / s.rankings.length).toFixed(2),
        TotalGols: totalGols,
        TotalGS: totalSofridos,
        Campeao: campeao,
        Promovidos: promovidos,
      });
    }
    out.Resumo_Competicao = {
      key: "Resumo_Competicao", title: "Resumo da Competição", category: "Dashboards",
      description: "Resumo de métricas principais por época.",
      columns: [
        { key: "Epoca", label: "Época", type: "text" },
        { key: "TotalPts", label: "Total Pts", type: "num" },
        { key: "AvgPts", label: "Média Pts", type: "num", decimals: 2 },
        { key: "TotalGols", label: "Golos Marcados", type: "num" },
        { key: "TotalGS", label: "Golos Sofridos", type: "num" },
        { key: "Campeao", label: "Campeão", type: "text" },
        { key: "Promovidos", label: "Promovidos", type: "int" },
      ],
      rows,
      sortKey: "Epoca",
      sortDir: "desc",
      entityKey: "Epoca",
    };
  }

  /* ============================ Mapa_Correlacao ============================ */
  {
    const clubs = out.Pontos_Totais.rows.map((row: any) => row.Equipa);
    const xPts = clubs.map((clube) => Number(out.Pontos_Totais.rows.find((r: any) => r.Equipa === clube)?.Total ?? 0));
    const xPtsFixos = clubs.map((clube) => Number(out.Pontos_Totais_Fixos.rows.find((r: any) => r.Equipa === clube)?.Total ?? 0));
    const xCoef = clubs.map((clube) => Number(out.Coef_Clube.rows.find((r: any) => r.Equipa === clube)?.Coef ?? 0));
    const xGols = clubs.map((clube) => Number(out.Golos_Marcados.rows.find((r: any) => r.Equipa === clube)?.Total ?? 0));
    const rows = [
      { Metrica: "Pts vs Coef", Correlacao: +pearsonCorrelation(xPts, xCoef).toFixed(3) },
      { Metrica: "Pts vs Pts Fixos", Correlacao: +pearsonCorrelation(xPts, xPtsFixos).toFixed(3) },
      { Metrica: "Pts vs Golos", Correlacao: +pearsonCorrelation(xPts, xGols).toFixed(3) },
      { Metrica: "Coef vs Golos", Correlacao: +pearsonCorrelation(xCoef, xGols).toFixed(3) },
    ];
    out.Mapa_Correlacao = {
      key: "Mapa_Correlacao", title: "Mapa de Correlação", category: "Dashboards",
      description: "Correlação entre métricas de clubes e desempenho.",
      columns: [
        { key: "Metrica", label: "Métrica", type: "text" },
        { key: "Correlacao", label: "Correlação", type: "num", decimals: 3 },
      ],
      rows,
      sortKey: "Correlacao",
      sortDir: "desc",
      entityKey: "Metrica",
    };
  }

  /* ============================ Sucesso_Paises ============================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const r of s.rankings) {
        const pais = s.equipasPais.get(r.Equipa); if (!pais) continue;
        const row = map.get(pais) || { Pais: pais, Campeoes: 0, Promovidos: 0 };
        if (isC(r.Inf)) row.Campeoes++;
        if (isP(r.Inf)) row.Promovidos++;
        map.set(pais, row);
      }
    }
    const rows = [...map.values()].map((r) => ({ ...r, Total: r.Campeoes + r.Promovidos }));
    out.Sucesso_Paises = {
      key: "Sucesso_Paises", title: "Sucesso de Países", category: "Países",
      description: "Campeões e promovidos por país.",
      columns: [
        { key: "Pais", label: "País", type: "text" },
        { key: "Campeoes", label: "Campeões", type: "int" },
        { key: "Promovidos", label: "Promovidos", type: "int" },
        { key: "Total", label: "Total", type: "int" },
      ],
      rows, sortKey: "Total", sortDir: "desc", entityKey: "Pais",
    };
  }

  /* ============================== Treinadores ============================== */
  if (modo.treinadores) {
    // Per-season: (epoca → (clube → { nome, nac })). Avoids attributing old titles to the current coach.
    const treinByEpClube = new Map<string, Map<string, { nome: string; nac: string }>>();
    // Latest known Nac per coach name (for display)
    const lastNacByName = new Map<string, string>();
    for (const s of seasons) {
      const m = new Map<string, { nome: string; nac: string }>();
      for (const t of s.treinadores) {
        if (t.Clube && t.Nome) {
          m.set(t.Clube, { nome: t.Nome, nac: t.Nac });
          if (t.Nac) lastNacByName.set(t.Nome, t.Nac);
        }
      }
      treinByEpClube.set(s.epoca, m);
    }
    const trainerFor = (epoca: string, clube: string) =>
      treinByEpClube.get(epoca)?.get(clube);
    function buildTrainer(weightFor: (div: number) => number, key: string, title: string) {
      const map = new Map<string, any>();
      for (const s of seasons) {
        for (const r of s.rankings) {
          const tr = trainerFor(s.epoca, r.Equipa); if (!tr) continue;
          const w = weightFor(r.Divisao) || 1;
          const v = +(r.Pts * w).toFixed(3);
          const row = map.get(tr.nome) || { Treinador: tr.nome, Nac: lastNacByName.get(tr.nome) || tr.nac };
          row[s.epoca] = (row[s.epoca] || 0) + v;
          map.set(tr.nome, row);
        }
      }
      const rows = [...map.values()].map((r) => {
        let t = 0; for (const e of epochs) if (typeof r[e] === "number") t += r[e];
        r.Total = +t.toFixed(2); return r;
      });
      out[key] = {
        key, title, category: "Treinadores", description: title,
        columns: [
          { key: "Treinador", label: "Treinador", type: "text" },
          { key: "Nac", label: "Nac", type: "text" },
          ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2 })),
          { key: "Total", label: "Total", type: "num", decimals: 2 },
        ],
        rows, sortKey: "Total", sortDir: "desc", entityKey: "Treinador", epochKeys: epochs,
      };
    }
    buildTrainer(() => 1, "Ranking_Treinador", "Ranking Treinador");
    buildTrainer((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Ranking_Treinador_Fixos", "Ranking Treinador (Fixos)");

    // Coef Treinador
    function buildCoefTrainer(weightFor: (div: number) => number, key: string, title: string) {
      const allEpochs = [...epochs].reverse();
      const last5 = epochs.slice(-5).reverse();
      const map = new Map<string, Map<string, number>>();
      for (const s of seasons) {
        for (const r of s.rankings) {
          const tr = trainerFor(s.epoca, r.Equipa); if (!tr) continue;
          const w = weightFor(r.Divisao) || 1;
          const v = r.Pts * w + bonusFor(r.Inf, r.Pos, r.Divisao);
          if (!map.has(tr.nome)) map.set(tr.nome, new Map());
          const m = map.get(tr.nome)!;
          m.set(s.epoca, (m.get(s.epoca) || 0) + v);
        }
      }
      const rows: any[] = [];
      for (const [nome, byEp] of map) {
        let coef = 0; const row: any = { Treinador: nome };
        allEpochs.forEach((e) => {
          const v = byEp.get(e) ?? 0; row[e] = +v.toFixed(2);
          const last5Idx = last5.indexOf(e);
          if (last5Idx >= 0) {
            coef += v * COEF_WEIGHTS[last5Idx];
            row[`__tip_${e}`] = `${e}: soma ${v.toFixed(2)} × ${COEF_WEIGHTS[last5Idx]} (peso temporal) → ${(v * COEF_WEIGHTS[last5Idx]).toFixed(2)}`;
          } else {
            row[`__tip_${e}`] = `${e}: soma ${v.toFixed(2)} (fora da janela do coef)`;
          }
        });
        row.Coef = +coef.toFixed(3); rows.push(row);
      }
      allEpochs.forEach((e) => {
        const sorted = [...rows].sort((a, b) => (b[e] ?? 0) - (a[e] ?? 0));
        sorted.forEach((row, pos) => {
          row[`__pos_${e}`] = pos + 1;
        });
      });
      out[key] = {
        key, title, category: "Treinadores", description: title,
        columns: [
          { key: "Treinador", label: "Treinador", type: "text" },
          ...allEpochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2, tooltipKey: `__tip_${e}` })),
          { key: "Coef", label: "Coef", type: "num", decimals: 3 },
        ],
        rows, sortKey: "Coef", sortDir: "desc", entityKey: "Treinador", epochKeys: allEpochs,
      };
    }
    buildCoefTrainer(() => 1, "Treinador_Coef", "Treinador Coef.");
    buildCoefTrainer((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Treinador_Coef_Fixos", "Treinador Coef. (Fixos)");

    function buildCumulativePage(
      source: RankingTable | undefined,
      key: string,
      title: string,
      description: string,
      entityCol: string,
    ) {
      if (!source?.epochKeys) return;
      const epochs = source.epochKeys;
      const cumulativeEpochs = [...epochs].sort((a, b) => String(a).localeCompare(String(b))); // chronological ascending
      const epRange = cumulativeEpochs.length
        ? `${cumulativeEpochs[0]} → ${cumulativeEpochs[cumulativeEpochs.length - 1]}`
        : "—";

      const cumulativeRows = source.rows.map((r) => {
        const row: any = { [entityCol]: r[entityCol] };
        let cumulativeValue = 0;
        cumulativeEpochs.forEach((e, i) => {
          const v = typeof r[e] === "number" ? r[e] : Number(r[e]) || 0;
          cumulativeValue += v; // soma integral, sem janela de 5 anos
          row[e] = +cumulativeValue.toFixed(3);
          row[`__tip_${e}`] = `Soma integral de ${i + 1} época(s) (${cumulativeEpochs[0]} → ${e}) = ${cumulativeValue.toFixed(3)}`;
        });
        return row;
      });

      epochs.forEach((e) => {
        const sorted = [...cumulativeRows].sort((a, b) => (b[e] ?? 0) - (a[e] ?? 0));
        sorted.forEach((row, pos) => {
          row[`__pos_${e}`] = pos + 1;
          row[`__tip_${e}`] = `${row[`__tip_${e}`] || ""}  ·  Posição acumulada: #${pos + 1}`;
        });
      });

      const fullDescription = `${description} Inclui todas as ${cumulativeEpochs.length} época(s) (${epRange}); cada coluna é a soma integral desde a primeira época até essa coluna.`;

      out[key] = {
        key,
        title,
        category: "Posições Geral",
        description: fullDescription,
        columns: [
          { key: entityCol, label: entityCol, type: "text" },
          ...epochs.map((e) => ({ key: e, label: `≤ ${e}`, type: "num" as const, decimals: 3, tooltipKey: `__tip_${e}` })),
        ],
        rows: cumulativeRows,
        sortKey: epochs[0],
        sortDir: "desc",
        entityKey: entityCol,
        epochKeys: epochs,
      };
    }

    /* ====== Posições Geral - Treinador Coef Fixos (extract cumulative values) ======== */
    buildCumulativePage(
      out.Treinador_Coef_Fixos,
      "Posicoes_Treinador_Coef_Fixos",
      "Coef. Treinador (Fixos) - Valores Acumulados",
      "Valores acumulados do coeficiente de cada treinador até cada época.",
      "Treinador",
    );
    buildCumulativePage(
      out.Ranking_Treinador,
      "Posicoes_Ranking_Treinador",
      "Ranking Treinador - Valores Acumulados",
      "Valores acumulados do ranking do treinador por época.",
      "Treinador",
    );
    buildCumulativePage(
      out.Ranking_Treinador_Fixos,
      "Posicoes_Ranking_Treinador_Fixos",
      "Ranking Treinador (Fixos) - Valores Acumulados",
      "Valores acumulados do ranking do treinador com pesos fixos.",
      "Treinador",
    );
    buildCumulativePage(
      out.Pontos_Totais,
      "Posicoes_Pontos_Totais",
      "Pontos Totais - Valores Acumulados",
      "Valores acumulados de pontos totais por equipa até cada época.",
      "Equipa",
    );
    buildCumulativePage(
      out.Pontos_Totais_Fixos,
      "Posicoes_Pontos_Totais_Fixos",
      "Pontos Totais (Fixos) - Valores Acumulados",
      "Valores acumulados de pontos totais ponderados por pesos fixos por equipa até cada época.",
      "Equipa",
    );


    // Treinador por Pais (Nac)
    function buildTrainerPais(weightFor: (div: number) => number, key: string, title: string) {
      const map = new Map<string, any>();
      for (const s of seasons) {
        for (const r of s.rankings) {
          const tr = trainerFor(s.epoca, r.Equipa); if (!tr) continue;
          const w = weightFor(r.Divisao) || 1;
          const v = r.Pts * w;
          const row = map.get(tr.nac || "—") || { Pais: tr.nac || "—" };
          row[s.epoca] = (row[s.epoca] || 0) + v;
          map.set(tr.nac || "—", row);
        }
      }
      const rows = [...map.values()].map((r) => {
        let t = 0; for (const e of epochs) if (typeof r[e] === "number") { r[e] = +r[e].toFixed(2); t += r[e]; }
        r.Total = +t.toFixed(2); return r;
      });
      out[key] = {
        key, title, category: "Treinadores", description: title,
        columns: [
          { key: "Pais", label: "País", type: "text" },
          ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, decimals: 2 })),
          { key: "Total", label: "Total", type: "num", decimals: 2 },
        ],
        rows, sortKey: "Total", sortDir: "desc", entityKey: "Pais", epochKeys: epochs,
      };
    }
    buildTrainerPais(() => 1, "Ranking_Treinador_Pais", "Treinadores por País");
    buildTrainerPais((d) => seasons[0]?.pesosFixos.get(d) ?? 1, "Ranking_Treinador_Pais_Fixo", "Treinadores por País (Fixos)");

    // Treinador Campeões
    {
      const map = new Map<string, any>();
      for (const s of seasons) {
        for (const r of s.rankings) {
          const tr = trainerFor(s.epoca, r.Equipa); if (!tr) continue;
          const row = map.get(tr.nome) || {
            Treinador: tr.nome, Nac: lastNacByName.get(tr.nome) || tr.nac,
            C: 0, P: 0, D: 0,
            _C: [] as string[], _P: [] as string[], _D: [] as string[],
          };
          if (isC(r.Inf)) { row.C++; row._C.push(`${r.Equipa} — ${s.epoca}`); }
          if (isP(r.Inf)) { row.P++; row._P.push(`${r.Equipa} — ${s.epoca} (Div ${r.Divisao})`); }
          if (isD(r.Inf)) { row.D++; row._D.push(`${r.Equipa} — ${s.epoca} (Div ${r.Divisao})`); }
          map.set(tr.nome, row);
        }
      }
      const rows = [...map.values()].map((r) => ({
        ...r,
        Total: r.C * 3 + r.P,
        __tip_C: r._C.length ? `Campeão com: ${r._C.join(", ")}` : "",
        __tip_P: r._P.length ? `Promoções: ${r._P.join(", ")}` : "",
        __tip_D: r._D.length ? `Despromoções: ${r._D.join(", ")}` : "",
      }));
      out.Treinador_Campeoes = {
        key: "Treinador_Campeoes", title: "Treinador Campeões", category: "Treinadores",
        description: "Títulos / promoções por treinador.",
        columns: [
          { key: "Treinador", label: "Treinador", type: "text" },
          { key: "Nac", label: "Nac", type: "text" },
          { key: "C", label: "Campeão", type: "int", tooltipKey: "__tip_C" },
          { key: "P", label: "Promovido", type: "int", tooltipKey: "__tip_P" },
          { key: "D", label: "Despromovido", type: "int", tooltipKey: "__tip_D" },
          { key: "Total", label: "Score", type: "num" },
        ],
        rows, sortKey: "Total", sortDir: "desc", entityKey: "Treinador",
      };
    }
    // Play-off treinadores
    {
      const map = new Map<string, any>();
      for (const s of seasons) {
        for (const r of s.rankings) {
          const tr = trainerFor(s.epoca, r.Equipa); if (!tr) continue;
          const row = map.get(tr.nome) || {
            Treinador: tr.nome, Nac: lastNacByName.get(tr.nome) || tr.nac,
            QuaseSubida: 0, QuaseTitulo: 0,
            _QS: [] as string[], _QT: [] as string[],
          };
          if (r.Divisao > 1 && r.Pos >= 2 && r.Pos <= 5 && !isP(r.Inf)) {
            row.QuaseSubida++; row._QS.push(`${r.Equipa} — ${s.epoca} (Div ${r.Divisao}, ${r.Pos}º)`);
          }
          if (r.Divisao === 1 && r.Pos <= 2 && !isC(r.Inf)) {
            row.QuaseTitulo++; row._QT.push(`${r.Equipa} — ${s.epoca} (${r.Pos}º)`);
          }
          map.set(tr.nome, row);
        }
      }
      const rows = [...map.values()].map((r) => ({
        ...r,
        Total: r.QuaseSubida + r.QuaseTitulo,
        __tip_QS: r._QS.length ? `Quase-subida: ${r._QS.join(", ")}` : "",
        __tip_QT: r._QT.length ? `Quase-título: ${r._QT.join(", ")}` : "",
      }))
        .filter((r) => r.Total > 0);
      out.Play_Off_Treinadores = {
        key: "Play_Off_Treinadores", title: "Play-Off Treinadores", category: "Treinadores",
        description: "Treinadores em quase-subida / quase-título.",
        columns: [
          { key: "Treinador", label: "Treinador", type: "text" },
          { key: "Nac", label: "Nac", type: "text" },
          { key: "QuaseSubida", label: "Quase Subida", type: "int", tooltipKey: "__tip_QS" },
          { key: "QuaseTitulo", label: "Quase Título", type: "int", tooltipKey: "__tip_QT" },
          { key: "Total", label: "Total", type: "int" },
        ],
        rows, sortKey: "Total", sortDir: "desc", entityKey: "Treinador",
      };
    }
  }

  /* ============================ Jogadores ================================= */
  if (modo.jogadores && lastSeason) {
    const playersBySeason = lastSeason; // current snapshot
    const clubeDiv = new Map<string, number>();
    for (const r of lastSeason.rankings) clubeDiv.set(r.Equipa, r.Divisao);

    const top28ByClub = new Map<string, typeof playersBySeason.jogadores>();
    const byClub = new Map<string, typeof playersBySeason.jogadores>();
    for (const j of playersBySeason.jogadores) {
      if (!byClub.has(j.Clube)) byClub.set(j.Clube, []);
      byClub.get(j.Clube)!.push(j);
    }
    for (const [c, arr] of byClub) {
      const sorted = [...arr].sort((a, b) => b.CA - a.CA).slice(0, 28);
      top28ByClub.set(c, sorted);
    }

    function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
    function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

    function clubTable(
      key: string, title: string, label: string,
      pick: (p: NormSeason["jogadores"][number]) => number,
      agg: "avg" | "sum",
      useTop28 = false,
      decimals = 2,
    ) {
      const rows: any[] = [];
      for (const [clube, arr] of byClub) {
        const set = useTop28 ? (top28ByClub.get(clube) || []) : arr;
        const vals = set.map(pick).filter((v) => Number.isFinite(v));
        const v = agg === "avg" ? avg(vals) : sum(vals);
        rows.push({
          Clube: clube,
          Liga: arr[0]?.Liga || "",
          Divisao: clubeDiv.get(clube) ?? "",
          [label]: +v.toFixed(decimals),
          N: set.length,
        });
      }
      out[key] = {
        key, title, category: "Jogadores", description: title,
        columns: [
          { key: "Clube", label: "Clube", type: "text" },
          { key: "Liga", label: "Liga", type: "text" },
          { key: "Divisao", label: "Divisão", type: "int" },
          { key: label, label, type: "num", decimals },
          { key: "N", label: "Nº jog.", type: "int" },
        ],
        rows, sortKey: label, sortDir: "desc", entityKey: "Clube",
      };
    }
    function divTable(
      key: string, title: string, label: string,
      pick: (p: NormSeason["jogadores"][number]) => number,
      agg: "avg" | "sum", useTop28 = false, decimals = 2,
    ) {
      const rows: any[] = [];
      for (let d = 1; d <= 11; d++) {
        const clubes = [...byClub.keys()].filter((c) => clubeDiv.get(c) === d);
        const all: number[] = [];
        for (const c of clubes) {
          const set = useTop28 ? (top28ByClub.get(c) || []) : (byClub.get(c) || []);
          for (const p of set) all.push(pick(p));
        }
        if (!all.length) continue;
        const v = agg === "avg" ? avg(all) : sum(all);
        rows.push({ Divisao: d, [label]: +v.toFixed(decimals), N: all.length });
      }
      out[key] = {
        key, title, category: "Jogadores", description: title,
        columns: [
          { key: "Divisao", label: "Divisão", type: "int" },
          { key: label, label, type: "num", decimals },
          { key: "N", label: "Nº jog.", type: "int" },
        ],
        rows, sortKey: label, sortDir: "desc",
      };
    }

    clubTable("Rep_Atual_Clubes", "Reputação Atual (Clubes)", "RA", (p) => p.RA, "avg", true);
    divTable("Rep_Atual_Divisao", "Reputação Atual (Divisão)", "RA", (p) => p.RA, "avg", true);
    clubTable("Rep_Mund_Clubes", "Reputação Mundial (Clubes)", "RM", (p) => p.RM, "avg", true);
    divTable("Rep_Mund_Divisao", "Reputação Mundial (Divisão)", "RM", (p) => p.RM, "avg", true);
    clubTable("CA_Clubes", "C.A. (Clubes)", "CA", (p) => p.CA, "avg", true);
    divTable("CA_Divisao", "C.A. (Divisão)", "CA", (p) => p.CA, "avg", true);
    clubTable("CP_Clubes", "C.P. (Clubes)", "CP", (p) => p.CP, "avg", true);
    divTable("CP_Divisao", "C.P. (Divisão)", "CP", (p) => p.CP, "avg", true);
    clubTable("Idade_Clubes", "Idade Média (Clubes)", "Idade", (p) => p.Idade, "avg");
    divTable("Idade_Divisao", "Idade Média (Divisão)", "Idade", (p) => p.Idade, "avg");
    clubTable("Salarios_Clubes", "Salários (Clubes)", "Salario", (p) => p.Salario, "sum", false, 0);
    divTable("Salarios_Divisao", "Salários (Divisão)", "Salario", (p) => p.Salario, "sum", false, 0);
    clubTable("VP_Clubes", "Valor de Plantel (Clubes)", "VP", (p) => p.VP, "sum", false, 0);
    divTable("VP_Divisao", "Valor de Plantel (Divisão)", "VP", (p) => p.VP, "sum", false, 0);

    /* Golos / Assistencias / Contagem */
    function buildPlayerStat(field: "Gls" | "Ast", key: string, title: string) {
      const map = new Map<string, any>();
      for (const s of seasons) {
        for (const j of s.jogadores) {
          const playerKey = j.IDU || j.Nome;
          const row = map.get(playerKey) || { Jogador: j.Nome };
          row[s.epoca] = (row[s.epoca] || 0) + j[field];
          row[`__clube_${s.epoca}`] = j.Clube;
          map.set(playerKey, row);
        }
      }
      const rows = [...map.values()].map((r) => {
        let t = 0;
        for (const e of epochs) if (typeof r[e] === "number") t += r[e];
        r.Total = t;
        return r;
      });
      out[key] = {
        key, title, category: "Jogadores", description: title,
        columns: [
          { key: "Jogador", label: "Jogador", type: "text" },
          ...epochs.map((e) => ({ key: e, label: e, type: "num" as const, tooltipKey: `__clube_${e}` })),
          { key: "Total", label: "Total", type: "num" },
        ],
        rows, sortKey: "Total", sortDir: "desc", entityKey: "Jogador", epochKeys: epochs,
      };
    }
    buildPlayerStat("Gls", "Golos", "Golos (Jogadores)");
    buildPlayerStat("Ast", "Assistencias", "Assistências (Jogadores)");

    {
      const rows: any[] = [];
      for (const [clube, arr] of byClub) {
        rows.push({
          Clube: clube,
          Liga: arr[0]?.Liga || "",
          Divisao: clubeDiv.get(clube) ?? "",
          Jogadores: arr.length,
          CA: +avg(arr.map((p) => p.CA)).toFixed(1),
          CP: +avg(arr.map((p) => p.CP)).toFixed(1),
          Salario: Math.round(sum(arr.map((p) => p.Salario))),
          VP: Math.round(sum(arr.map((p) => p.VP))),
        });
      }
      out.Contagem = {
        key: "Contagem", title: "Contagem de Jogadores", category: "Jogadores",
        description: "Plantel por clube.",
        columns: [
          { key: "Clube", label: "Clube", type: "text" },
          { key: "Liga", label: "Liga", type: "text" },
          { key: "Divisao", label: "Divisão", type: "int" },
          { key: "Jogadores", label: "Jogadores", type: "int" },
          { key: "CA", label: "C.A.", type: "num", decimals: 1 },
          { key: "CP", label: "C.P.", type: "num", decimals: 1 },
          { key: "Salario", label: "Salário", type: "num" },
          { key: "VP", label: "VP", type: "num" },
        ],
        rows, sortKey: "VP", sortDir: "desc", entityKey: "Clube",
      };
    }
  }

  /* ======================= Performance de Jogadores ======================= */
  {
    const map = new Map<string, any>();
    for (const s of seasons) {
      for (const p of s.jogadores) {
        const playerKey = p.IDU || p.Nome;
        const row = map.get(playerKey) || {
          Jogador: p.Nome,
          Clube: p.Clube,
          Liga: p.Liga,
          Idade: p.Idade,
          Salario: p.Salario,
          VP: p.VP,
          Gls: 0,
          Ast: 0,
          Total: 0,
        };
        row.Gls += p.Gls;
        row.Ast += p.Ast;
        row.Total = row.Gls + row.Ast;
        row.Idade = p.Idade || row.Idade;
        row.Salario = p.Salario || row.Salario;
        row.VP = p.VP || row.VP;
        row.Clube = p.Clube || row.Clube;
        row.Liga = p.Liga || row.Liga;
        map.set(playerKey, row);
      }
    }
    out.Performance_Jogadores = {
      key: "Performance_Jogadores", title: "Performance de Jogadores", category: "Jogadores",
      description: "Resumo de golos, assistências e desempenho por jogador.",
      columns: [
        { key: "Jogador", label: "Jogador", type: "text" },
        { key: "Clube", label: "Clube", type: "text" },
        { key: "Liga", label: "Liga", type: "text" },
        { key: "Idade", label: "Idade", type: "int" },
        { key: "Gls", label: "Gols", type: "num" },
        { key: "Ast", label: "Assistências", type: "num" },
        { key: "Total", label: "Total", type: "num" },
        { key: "Salario", label: "Salário", type: "num" },
        { key: "VP", label: "VP", type: "num" },
      ],
      rows: [...map.values()].map((r) => ({
        ...r,
        Gls: r.Gls,
        Ast: r.Ast,
        Total: r.Total,
      })),
      sortKey: "Total",
      sortDir: "desc",
      entityKey: "Jogador",
    };
  }

  /* =================== Pós: injectar coluna País em Clubes ================ */
  {
    const paisByClube = new Map<string, string>();
    for (const s of seasons) {
      for (const [c, p] of s.equipasPais) {
        if (p && !paisByClube.has(c)) paisByClube.set(c, p);
      }
    }
    for (const t of Object.values(out)) {
      if (t.category !== "Clubes") continue;
      const hasEquipa = t.columns.some((c) => c.key === "Equipa");
      const hasPais = t.columns.some((c) => c.key === "Pais");
      if (!hasEquipa || hasPais) continue;
      // insert Pais column right after Equipa
      const idx = t.columns.findIndex((c) => c.key === "Equipa");
      const paisCol: ColDef = { key: "Pais", label: "País", type: "text" };
      t.columns = [...t.columns.slice(0, idx + 1), paisCol, ...t.columns.slice(idx + 1)];
      for (const r of t.rows) {
        if (r.Pais === undefined) r.Pais = paisByClube.get(String(r.Equipa)) || "";
      }
    }
  }

  return out;
}