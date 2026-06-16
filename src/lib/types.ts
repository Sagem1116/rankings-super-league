export type ColType = "text" | "num" | "int" | "pos";

export interface ColDef {
  key: string;
  label: string;
  type?: ColType;
  decimals?: number;
  tooltipKey?: string; // points at row[key] for extra tooltip text
}

export interface RankingRow {
  [k: string]: string | number | null | undefined;
}

export interface RankingTable {
  key: string;
  title: string;
  category: PageCategory;
  description: string;
  columns: ColDef[];
  rows: RankingRow[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  /** entity column key used for scouting (e.g. Equipa, Treinador, Pais) */
  entityKey?: string;
  /** numeric epoch column keys (years) */
  epochKeys?: string[];
}

export type PageCategory =
  | "Clubes"
  | "Países"
  | "Treinadores"
  | "Posições Geral"
  | "Jogadores"
  | "Golos"
  | "Rankings Especiais"
  | "Divisões"
  | "Competições"
  | "Dashboards"
  | "Scouting"
  | "Administração";

export interface SuperLeagueRow {
  Epoca?: string | number;
  Equipa: string;
  Treinador?: string;
  Pos: number;
  Inf?: string;
  Pts?: number;
}

export interface PageMeta {
  key: string;
  title: string;
  category: PageCategory;
  description: string;
  /** which mode the page belongs to */
  mode: "rankings" | "treinadores" | "jogadores" | "always";
  /** routes: "table" | "dashboard" | "scouting" | "indice" */
  kind: "table" | "dashboard" | "scouting" | "indice";
}

export interface RawSheets {
  Ranking: any[];
  Equipas_Pais: any[];
  Treinadores: any[];
  Jogadores: any[];
  Pesos_Fixos: any[];
  Super_League?: any[];
}

export interface SeasonData extends RawSheets {
  epoca: string;
}

export interface ModoAtivo {
  rankings: boolean;
  treinadores: boolean;
  jogadores: boolean;
}