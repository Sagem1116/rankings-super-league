import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Columns3, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import type { RankingTable, RankingRow } from "@/lib/types";

const ENTITY_ROUTES: Record<string, "/perfil/clube/$nome" | "/perfil/treinador/$nome" | "/perfil/jogador/$nome" | "/perfil/pais/$nome"> = {
  Equipa: "/perfil/clube/$nome",
  Clube: "/perfil/clube/$nome",
  Treinador: "/perfil/treinador/$nome",
  Jogador: "/perfil/jogador/$nome",
  Pais: "/perfil/pais/$nome",
};

const PAGE_SIZE = 50;

function rankBadge(pos: number) {
  if (pos === 1) return <span title="1º lugar">🥇</span>;
  if (pos === 2) return <span title="2º lugar">🥈</span>;
  if (pos === 3) return <span title="3º lugar">🥉</span>;
  return <span className="text-white">{pos}</span>;
}

function fmt(v: any, type?: string, decimals = 0) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (type === "int") return v.toLocaleString("pt-PT", { maximumFractionDigits: 0 });
    return v.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: Math.max(decimals, 3) });
  }
  return String(v);
}

export function DataTable({ table, limit }: { table: RankingTable; limit?: number }) {
  const [sortKey, setSortKey] = useState(table.sortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(table.sortDir ?? "desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const allCols = useMemo(() => table.columns.filter((c) => !c.key.startsWith("__")), [table.columns]);
  const storageKey = `dt-cols:${table.key}`;
  const epochSet = useMemo(() => new Set(table.epochKeys ?? []), [table.epochKeys]);
  const rankDir: "asc" | "desc" = table.sortDir ?? "desc";

  const rankingKey = table.sortKey ?? sortKey;
  const rankingDir = table.sortDir ?? sortDir;
  const rowRanks = useMemo(() => {
    const m = new Map<number, number>();
    if (!rankingKey) return m;
    const vals: { idx: number; v: unknown }[] = [];
    table.rows.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      vals.push({ idx, v: r[rankingKey] });
    });
    vals.sort((a, b) => {
      const av = a.v; const bv = b.v;
      if (typeof av === 'number' && typeof bv === 'number') return rankingDir === 'asc' ? av - bv : bv - av;
      return rankingDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    vals.forEach((x, i) => m.set(x.idx, i + 1));
    return m;
  }, [table.rows, rankingKey, rankingDir]);

  const epochRanks = useMemo(() => {
    const ranks = new Map<string, Map<number, number>>();
    if (!table.epochKeys?.length) return ranks;
    table.epochKeys.forEach((epochKey) => {
      const m = new Map<number, number>();
      const vals: { idx: number; v: unknown }[] = [];
      table.rows.forEach((r, idx) => {
        if (!r || typeof r !== 'object') return;
        vals.push({ idx, v: r[epochKey] });
      });
      vals.sort((a, b) => {
        const av = a.v; const bv = b.v;
        if (typeof av === 'number' && typeof bv === 'number') return bv - av;
        return String(bv ?? '').localeCompare(String(av ?? ''));
      });
      vals.forEach((x, i) => m.set(x.idx, i + 1));
      ranks.set(epochKey, m);
    });
    return ranks;
  }, [table.epochKeys, table.rows]);

  const rowIndexMap = useMemo(() => {
    const m = new Map<any, number>();
    table.rows.forEach((r, i) => {
      if (r && typeof r === 'object') m.set(r, i);
    });
    return m;
  }, [table.rows]);

  type ColState = { order: string[]; hidden: string[] };
  const defaultState: ColState = useMemo(() => ({ order: allCols.map((c) => c.key), hidden: [] }), [allCols]);

  const [colState, setColState] = useState<ColState>(defaultState);
  const [colMenu, setColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ColState;
        const validKeys = new Set(allCols.map((c) => c.key));
        const order = parsed.order.filter((k) => validKeys.has(k));
        for (const c of allCols) if (!order.includes(c.key)) order.push(c.key);
        const hidden = parsed.hidden.filter((k) => validKeys.has(k));
        setColState({ order, hidden });
        return;
      }
    } catch {}
    setColState(defaultState);
  }, [storageKey, allCols, defaultState]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(colState)); } catch {}
  }, [storageKey, colState]);

  useEffect(() => {
    if (!colMenu) return;
    const h = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [colMenu]);

  const visibleCols = useMemo(() => {
    const byKey = new Map(allCols.map((c) => [c.key, c]));
    const hidden = new Set(colState.hidden);
    return colState.order.map((k) => byKey.get(k)!).filter((c) => c && !hidden.has(c.key));
  }, [allCols, colState]);

  // Compute numeric min/max for visible columns to normalise values for colouring
  const colStats = useMemo(() => {
    const m = new Map();
    visibleCols.forEach((c) => {
      let min = Infinity;
      let max = -Infinity;
      table.rows.forEach((r) => {
        const v = Number(r[c.key]);
        if (Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
      if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 0; }
      m.set(c.key, { min, max });
    });
    return m;
  }, [table.rows, visibleCols]);

  function interpColor(a: number[], b: number[], t: number) {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  }
  function hexToRgb(hex: string) { // simple hex to rgb
    const h = hex.replace('#','');
    const bigint = parseInt(h.length === 3 ? h.split('').map(x=>x+x).join('') : h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
const purpleLight = hexToRgb('#c4b5fd');
  const purpleDeep = hexToRgb('#7c3aed');
 
  function valueToBgColor(key: string, rawVal: number | null) {
    if (rawVal === null || !colStats.has(key)) return 'transparent';
    const { min, max } = colStats.get(key);
    const norm = max === min ? 0.5 : Math.min(1, Math.max(0, (rawVal - min) / (max - min)));
    const rgb = interpColor(purpleLight, purpleDeep, norm);
    return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / 0.24)`;
  }

  function valueToTextColor(bgRgb: string) {
    try {
      const m = bgRgb.match(/rgb\((\d+)\s+(\d+)\s+(\d+)/);
      if (!m) return 'white';
      const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.65 ? 'rgba(0,0,0,0.9)' : 'white';
    } catch { return 'white'; }
  }

  function toggleHidden(k: string) {
    setColState((s) => ({ ...s, hidden: s.hidden.includes(k) ? s.hidden.filter((x) => x !== k) : [...s.hidden, k] }));
  }
  function move(k: string, dir: -1 | 1) {
    setColState((s) => {
      const i = s.order.indexOf(k); const j = i + dir;
      if (i < 0 || j < 0 || j >= s.order.length) return s;
      const order = [...s.order]; [order[i], order[j]] = [order[j], order[i]];
      return { ...s, order };
    });
  }

  const filtered = useMemo(
    () => filterAndSortRows(table.rows, filters, visibleCols, sortKey, sortDir),
    [table.rows, sortKey, sortDir, filters, visibleCols],
  );


  const limited = limit ? filtered.slice(0, limit) : filtered;
  const totalPages = Math.max(1, Math.ceil(limited.length / PAGE_SIZE));
  const pageRows = limit ? limited : limited.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div
      className="overflow-hidden rounded-[2rem] border border-violet-500/10 bg-slate-950/80 ring-1 ring-violet-500/10 shadow-[0_50px_120px_-70px_rgba(99,102,241,0.6),0_0_40px_-4px_rgba(167,139,250,0.18)]"
      style={{ backgroundImage: "radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 32%), rgba(7,9,18,0.92)" }}
    >
      {!limit && (
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-3 py-2">
          <div className="text-[12px] text-slate-300">
            {visibleCols.length} / {allCols.length} colunas visíveis
          </div>
          <div ref={colMenuRef} className="relative">
            <button
              onClick={() => setColMenu((o) => !o)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-[#334155] bg-[#0b1220] px-3 text-[12px] font-medium text-violet-300 transition hover:border-violet-400/70 hover:text-violet-200"
            >
              <Columns3 className="h-3.5 w-3.5" /> Colunas
            </button>
            {colMenu && (
              <div className="absolute right-0 top-full z-40 mt-1.5 max-h-[60vh] w-72 overflow-y-auto rounded-3xl border border-white/10 p-2 shadow-2xl"
                style={{ backgroundColor: "rgba(6, 11, 23, 0.98)", boxShadow: "0 25px 90px -40px rgba(99,102,241,0.45)" }}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">Mostrar / Reordenar</span>
                  <button onClick={() => setColState(defaultState)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-200">
                    <RotateCcw className="h-3 w-3" /> Repor
                  </button>
                </div>
                {colState.order.map((k, i) => {
                  const c = allCols.find((x) => x.key === k); if (!c) return null;
                  const hidden = colState.hidden.includes(k);
                  return (
                    <div key={k} className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-secondary/50">
                      <button onClick={() => toggleHidden(k)} title={hidden ? "Mostrar" : "Ocultar"}
                        className="text-muted-foreground hover:text-violet-200">
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-violet-200" />}
                      </button>
                      <span className={`flex-1 truncate text-[12px] ${hidden ? "text-muted-foreground/60 line-through" : ""}`}>
                        {c.label}
                      </span>
                      <button disabled={i === 0} onClick={() => move(k, -1)}
                        className="text-muted-foreground hover:text-violet-200 disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button disabled={i === colState.order.length - 1} onClick={() => move(k, 1)}
                        className="text-muted-foreground hover:text-violet-200 disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead className="font-display bg-gradient-to-r from-violet-950 via-slate-950 to-violet-950/90 text-slate-200">
            <tr className="border-b border-violet-500/10">
              <th className="px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-violet-200">#</th>
              {visibleCols.map((c) => (
                <th key={c.key} className="px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">
                  <button onClick={() => {
                    if (sortKey === c.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else { setSortKey(c.key); setSortDir("desc"); }
                  }} className="flex items-center gap-1 hover:text-violet-200">
                    {c.label}{sortKey === c.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="bg-[#0f172a]">
              <th></th>
              {visibleCols.map((c) => (
                <th key={c.key} className="px-2 py-1.5">
                  <input value={filters[c.key] ?? ""}
                    onChange={(e) => { setFilters((f) => ({ ...f, [c.key]: e.target.value })); setPage(1); }}
                    placeholder="filtrar…"
                    className="w-full rounded-2xl border border-[#334155] bg-[#020617] px-2 py-2 text-[12px] text-slate-200 placeholder:text-slate-500 focus:border-violet-400/70 focus:outline-none focus:ring-1 focus:ring-violet-400/20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const rank = (limit ? 0 : (page - 1) * PAGE_SIZE) + i + 1;
              return (
                <tr key={i} className={`transition-colors duration-200 hover:bg-violet-500/10 ${i % 2 === 0 ? "bg-slate-950/70" : "bg-slate-950/30"}`}>
                  <td className="px-3 py-2 font-medium tabular-nums bg-[#080b14] text-violet-300">{rankBadge(rank)}</td>
                  {visibleCols.map((c) => {
                    const tipRaw = c.tooltipKey ? r[c.tooltipKey] : undefined;
                    const tooltip = tipRaw ? String(tipRaw) : undefined;
                    const route = ENTITY_ROUTES[c.key];
                    const raw = r[c.key];
                    const display = fmt(raw, c.type, c.decimals);
                    const isLinkable = route && raw !== null && raw !== undefined && raw !== "";
                    const isEpoch = epochSet.has(c.key);
                    const idx = rowIndexMap.get(r);
                    const rowRank = idx !== undefined ? rowRanks.get(idx) : undefined;
                    const posKey = isEpoch ? `__pos_${c.key}` : undefined;
                    const epochPosRaw = posKey ? r[posKey] : undefined;
                    const epochPos = typeof epochPosRaw === "number"
                      ? epochPosRaw
                      : typeof epochPosRaw === "string" && epochPosRaw !== ""
                        ? Number(epochPosRaw)
                        : undefined;
                    const rowEpochRank = isEpoch && idx !== undefined
                      ? epochPos ?? epochRanks.get(c.key)?.get(idx)
                      : undefined;
                    const rankToShow = isEpoch ? rowEpochRank : rowRank;
                    const showRowRank = rankToShow !== undefined && (isEpoch || c.key === rankingKey);
                    const rankTooltip = rankToShow !== undefined
                      ? isEpoch
                        ? `${c.label}: #${rankToShow}`
                        : `${c.label}: #${rankToShow}`
                      : undefined;
                    const finalTooltip = [tooltip, rankTooltip].filter(Boolean).join(" • ") || undefined;
                    const numeric = typeof raw === 'number' || (typeof raw === 'string' && raw !== '' && !Number.isNaN(Number(raw)));
                    const numVal = numeric ? Number(raw) : null;
                    const pillBg = numeric ? valueToBgColor(c.key, numVal) : null;
                    const pillColor = pillBg ? valueToTextColor(pillBg) : undefined;
                    const content = (
                      <span className="inline-flex items-baseline gap-2">
                        {numeric ? (
                          <span className="value-pill rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums" style={{ background: pillBg ?? undefined, color: pillColor ?? undefined }}>
                            {display}
                          </span>
                        ) : (
                          <span>{display}</span>
                        )}
                        {showRowRank ? (
                          <span className="rounded-sm bg-violet-300/10 px-1 text-[10px] font-semibold text-violet-200/80">
                            #{rankToShow}
                          </span>
                        ) : null}
                      </span>
                    );
                    return (
                      <td
                        key={c.key}
                        title={finalTooltip}
                        className={`px-3 py-2 tabular-nums text-slate-200 ${(tooltip || rankTooltip) ? "cursor-help underline decoration-dotted decoration-violet-400/40 underline-offset-4" : ""}`}
                      >
                        {isLinkable ? (
                          <Link to={route} params={{ nome: encodeURIComponent(String(raw)) }}
                            className="font-medium text-violet-300 transition-colors hover:text-violet-200 hover:underline">
                            {content}
                          </Link>
                        ) : content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!pageRows.length && (
              <tr><td colSpan={visibleCols.length + 1} className="px-3 py-8 text-center text-muted-foreground">Sem dados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0b1220]/90 px-4 py-2.5 text-[12px] text-slate-300">
          <span>{limited.length} linhas</span>
          <div className="flex items-center gap-1.5">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-full border border-[#334155] bg-[#08101d] px-2.5 py-1 text-slate-300 transition hover:border-violet-400/70 hover:text-violet-300 disabled:opacity-40">‹</button>
            <span className="px-2 py-1 tabular-nums text-slate-200">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-[#334155] bg-[#08101d] px-2.5 py-1 text-slate-300 transition hover:border-violet-400/70 hover:text-violet-300 disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </div>
  );
}

