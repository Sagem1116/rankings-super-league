import type { ColDef, RankingRow } from "./types";

export function filterAndSortRows(
  rows: RankingRow[],
  filters: Record<string, string>,
  visibleCols: ColDef[],
  sortKey?: string,
  sortDir: "asc" | "desc" = "desc",
): RankingRow[] {
  const out = rows.filter((r) =>
    visibleCols.every((c) => {
      const f = filters[c.key]?.toLowerCase().trim();
      if (!f) return true;
      return String(r[c.key] ?? "").toLowerCase().includes(f);
    }),
  );
  if (sortKey) {
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
  }
  return out;
}
