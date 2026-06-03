import ExcelJS from "exceljs";
import type { RankingTable } from "./types";
import { PAGES } from "./page-registry";

export async function exportAllToExcel(resultados: Record<string, RankingTable>) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FM Elite Manager";
  wb.created = new Date();

  const idx = wb.addWorksheet("Indice");
  idx.columns = [
    { header: "Categoria", key: "cat", width: 22 },
    { header: "Página", key: "page", width: 36 },
    { header: "Descrição", key: "desc", width: 80 },
  ];
  styleHeader(idx);

  for (const meta of PAGES) {
    if (meta.kind !== "table") continue;
    const table = resultados[meta.key];
    if (!table) continue;
    const safe = sheetName(meta.title);
    const row = idx.addRow({ cat: meta.category, page: meta.title, desc: meta.description });
    row.getCell("page").value = { text: meta.title, hyperlink: `#'${safe}'!A1` } as any;
    row.getCell("page").font = { color: { argb: "FF1F4E78" }, underline: true };

    const epochRanks = computeEpochPositions(table);
    const posCols = table.epochKeys?.length
      ? table.epochKeys.map((epochKey) => ({ header: `Posição ${epochKey}`, key: `__pos_${epochKey}`, width: Math.max(12, `Posição ${epochKey}`.length + 2) }))
      : [];

    const ws = wb.addWorksheet(safe);
    const cols = table.columns.filter((c) => !c.key.startsWith("__"));
    ws.columns = [...cols.map((c) => ({ header: c.label, key: c.key, width: Math.max(12, c.label.length + 2) })), ...posCols];
    styleHeader(ws);
    let i = 0;
    for (const r of [...table.rows].sort((a, b) => sortVal(a, b, table))) {
      const exportRow: Record<string, any> = { ...r };
      if (epochRanks.size) {
        const ranks = epochRanks.get(r);
        table.epochKeys?.forEach((epochKey) => {
          exportRow[`__pos_${epochKey}`] = ranks?.[epochKey] ?? null;
        });
      }
      const dataRow = ws.addRow(exportRow);
      i++;
      if (i % 2 === 0) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        });
      }
    }
    ws.columns.forEach((col) => {
      let max = String(col.header ?? "").length;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const v = cell.value == null ? "" : String((cell.value as any).text ?? cell.value);
        if (v.length > max) max = v.length;
      });
      col.width = Math.min(60, Math.max(12, max + 2));
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "FM_Elite_Manager.xlsx"; a.click();
  URL.revokeObjectURL(url);
}

function styleHeader(ws: ExcelJS.Worksheet) {
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}

function sheetName(s: string): string {
  return s.replace(/[\\/?*\[\]:]/g, "_").slice(0, 31);
}

function sortVal(a: any, b: any, t: RankingTable): number {
  const k = exportSortKey(t);
  if (!k) return 0;
  const av = a[k], bv = b[k];
  if (typeof av === "number" && typeof bv === "number") return t.sortDir === "asc" ? av - bv : bv - av;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

function exportSortKey(t: RankingTable): string | undefined {
  if (t.epochKeys?.length) {
    return t.epochKeys[t.epochKeys.length - 1];
  }
  const visible = t.columns.filter((c) => !c.key.startsWith("__"));
  return visible.length ? visible[visible.length - 1].key : t.sortKey;
}

function computeEpochPositions(t: RankingTable): Map<any, Record<string, number>> {
  const ranks = new Map<any, Record<string, number>>();
  t.rows.forEach((row) => ranks.set(row, {} as Record<string, number>));
  if (!t.epochKeys?.length) return ranks;

  for (const epochKey of t.epochKeys) {
    const sorted = [...t.rows].sort((a, b) => {
      const av = a[epochKey];
      const bv = b[epochKey];
      if (typeof av === "number" && typeof bv === "number") return bv - av;
      return String(bv ?? "").localeCompare(String(av ?? ""));
    });
    sorted.forEach((row, index) => {
      const record = ranks.get(row);
      if (record) record[epochKey] = index + 1;
    });
  }

  return ranks;
}
