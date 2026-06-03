# Project Analysis - FM Elite Manager

This summary lists pages, core functions, and rankings in the repository.

## Pages (routes)

- Index: [src/routes/index.tsx](src/routes/index.tsx) — Upload panel and index of available pages (links generated from `PAGES`).
- Table page: [src/routes/tabela.$key.tsx](src/routes/tabela.$key.tsx) — Generic table renderer using `DataTable` and `PAGE_BY_KEY`.
- Dashboard: [src/routes/dashboard.$key.tsx](src/routes/dashboard.$key.tsx) — Composes top-N slices and `WorldMap` for `Mapa_Mundo`.
- Scouting: [src/routes/scouting.tsx](src/routes/scouting.tsx) — Interactive scouting and comparator using recharts.
- Club profile: [src/routes/perfil.clube.$nome.tsx](src/routes/perfil.clube.$nome.tsx) — Uses `buildClubProfile`, `RankingEvolutionChart`, `ValueEvolutionChart`.
- Player profile: [src/routes/perfil.jogador.$nome.tsx](src/routes/perfil.jogador.$nome.tsx) — Uses `buildPlayerProfile` to display per-epoch stats.
- Root/shell: [src/routes/__root.tsx](src/routes/__root.tsx) — App shell, head/meta, layout and router context.

## Core libraries

- Engine: [src/lib/calc/engine.ts](src/lib/calc/engine.ts) — `normalizeSeason`, `computeAll` and many ranking builders (club, country, coach, player, special rankings).
- Parse Excel: [src/lib/parse-excel.ts](src/lib/parse-excel.ts) — `parseWorkbook` using `xlsx`.
- Export Excel: [src/lib/export-excel.ts](src/lib/export-excel.ts) — `exportAllToExcel` using `exceljs`.
- Profiles: [src/lib/profiles.ts](src/lib/profiles.ts) — `buildClubProfile`, `buildCoachProfile`, `buildPlayerProfile`, `buildCountryProfile`.
- UI: `src/components/data-table.tsx`, `src/components/upload-panel.tsx`, `src/components/world-map.tsx`, `src/components/page-header.tsx`, `src/components/ranking-evolution-chart.tsx`.

## Notable Rankings (quick)

- `Pontos_Totais` — sum of points per team across seasons.
- `Coef_Clube_Fixos` / `Coef_Clube` / `Coef_Clube_Dinamicos` — weighted coefficients using last 5 epochs + bonus.
- `Ranking_Underdogs`, `Ranking_Rolo_Compressor`, `Ranking_Muralha` — special rankings with defined formulas in engine.
- Player stats: `Golos`, `Assistencias` and aggregated club/player metrics.

## Quick recommendations

- Add unit tests for `normalizeSeason`, `computeAll`, `parseVP`, `parseSalario`.
- Split `engine.ts` into domain modules for maintainability and testability.
- Improve parsing diagnostics in `parseWorkbook` and expose per-file errors in the UI.
- Add tests for `DataTable` filters and column persistence.

---

Files created:
- `analysis.json` (machine-readable analysis)
- `summary.md` (human summary)

Would you like me to also generate unit test stubs (vitest) for `normalizeSeason`, `computeAll`, and `DataTable`?"