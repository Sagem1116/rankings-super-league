import type { NormSeason } from "./calc/engine";

function tokens(inf: string): Set<string> {
  return new Set(
    String(inf || "")
      .toUpperCase()
      .split(/[\s,;/|+]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}
const isC = (i: string) => tokens(i).has("C");
const isP = (i: string) => tokens(i).has("P");
const isD = (i: string) => tokens(i).has("D");

export interface Marker { epoca: string; divisao: number; pos: number; clube?: string; }

export interface ClubProfile {
  nome: string;
  pais: string;
  posicoes: Array<{ epoca: string; divisao: number; pos: number; inf: string; pts: number }>;
  campeao: Marker[];
  promovido: Marker[];
  quaseSubida: Marker[];
  quaseTitulo: Marker[];
  despromovido: Marker[];
  treinadorAtual: { nome: string; nac: string } | null;
  treinadoresHistorico: Array<{ epoca: string; nome: string; nac: string }>;
  jogadores: Array<{ nome: string; idade: number; CA: number; CP: number; salario: number; VP: number }>;
  liga: string;
  divisaoAtual: number | null;
}

export function buildClubProfile(seasons: NormSeason[], nome: string): ClubProfile | null {
  const sorted = [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
  const posicoes: ClubProfile["posicoes"] = [];
  const campeao: Marker[] = [], promovido: Marker[] = [], quaseSubida: Marker[] = [],
    quaseTitulo: Marker[] = [], despromovido: Marker[] = [];
  let pais = "";
  const treinadoresHistorico: ClubProfile["treinadoresHistorico"] = [];
  let treinadorAtual: ClubProfile["treinadorAtual"] = null;
  let liga = "", divisaoAtual: number | null = null;
  let jogadores: ClubProfile["jogadores"] = [];

  for (const s of sorted) {
    pais = pais || s.equipasPais.get(nome) || "";
    const r = s.rankings.find((x) => x.Equipa === nome);
    if (r) {
      posicoes.push({ epoca: s.epoca, divisao: r.Divisao, pos: r.Pos, inf: r.Inf, pts: r.Pts });
      const m: Marker = { epoca: s.epoca, divisao: r.Divisao, pos: r.Pos };
      if (isC(r.Inf)) campeao.push(m);
      if (isP(r.Inf)) promovido.push(m);
      if (isD(r.Inf)) despromovido.push(m);
      if (r.Divisao > 1 && r.Pos >= 2 && r.Pos <= 5 && !isP(r.Inf)) quaseSubida.push(m);
      if (r.Divisao === 1 && r.Pos <= 2 && !isC(r.Inf)) quaseTitulo.push(m);
    }
    const t = s.treinadores.find((tt) => tt.Clube === nome);
    if (t) {
      treinadoresHistorico.push({ epoca: s.epoca, nome: t.Nome, nac: t.Nac });
      treinadorAtual = { nome: t.Nome, nac: t.Nac };
    }
  }
  const last = sorted[sorted.length - 1];
  if (last) {
    const r = last.rankings.find((x) => x.Equipa === nome);
    divisaoAtual = r?.Divisao ?? null;
    const js = last.jogadores.filter((j) => j.Clube === nome);
    liga = js[0]?.Liga || "";
    jogadores = js.map((j) => ({ nome: j.Nome, idade: j.Idade, CA: j.CA, CP: j.CP, salario: j.Salario, VP: j.VP }))
      .sort((a, b) => b.CA - a.CA);
  }
  if (!posicoes.length && !jogadores.length && !treinadoresHistorico.length) return null;
  return { nome, pais, posicoes, campeao, promovido, quaseSubida, quaseTitulo, despromovido,
    treinadorAtual, treinadoresHistorico, jogadores, liga, divisaoAtual };
}

export interface CoachProfile {
  nome: string;
  nac: string;
  passagens: Array<{ epoca: string; clube: string; divisao: number; pos: number; inf: string; pts: number }>;
  campeao: Marker[];
  promovido: Marker[];
  quaseSubida: Marker[];
  quaseTitulo: Marker[];
  despromovido: Marker[];
}

export function buildCoachProfile(seasons: NormSeason[], nome: string): CoachProfile | null {
  const sorted = [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
  const passagens: CoachProfile["passagens"] = [];
  const campeao: Marker[] = [], promovido: Marker[] = [], quaseSubida: Marker[] = [],
    quaseTitulo: Marker[] = [], despromovido: Marker[] = [];
  let nac = "";
  for (const s of sorted) {
    const t = s.treinadores.find((tt) => tt.Nome === nome);
    if (!t) continue;
    nac = nac || t.Nac;
    const r = s.rankings.find((x) => x.Equipa === t.Clube);
    if (!r) continue;
    passagens.push({ epoca: s.epoca, clube: t.Clube, divisao: r.Divisao, pos: r.Pos, inf: r.Inf, pts: r.Pts });
    const m: Marker = { epoca: s.epoca, divisao: r.Divisao, pos: r.Pos, clube: t.Clube };
    if (isC(r.Inf)) campeao.push(m);
    if (isP(r.Inf)) promovido.push(m);
    if (isD(r.Inf)) despromovido.push(m);
    if (r.Divisao > 1 && r.Pos >= 2 && r.Pos <= 5 && !isP(r.Inf)) quaseSubida.push(m);
    if (r.Divisao === 1 && r.Pos <= 2 && !isC(r.Inf)) quaseTitulo.push(m);
  }
  if (!passagens.length) return null;
  return { nome, nac, passagens, campeao, promovido, quaseSubida, quaseTitulo, despromovido };
}

export interface PlayerProfile {
  nome: string;
  totalGolos: number;
  totalAst: number;
  porEpoca: Array<{ epoca: string; clube: string; liga: string; gls: number; ast: number; idade: number; CA: number; CP: number; salario: number; VP: number }>;
  clubes: string[];
}

export function buildPlayerProfile(seasons: NormSeason[], nome: string): PlayerProfile | null {
  const sorted = [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
  const porEpoca: PlayerProfile["porEpoca"] = [];
  const clubesSet = new Set<string>();
  let totalGolos = 0, totalAst = 0;
  for (const s of sorted) {
    const j = s.jogadores.find((x) => x.Nome === nome);
    if (!j) continue;
    porEpoca.push({ epoca: s.epoca, clube: j.Clube, liga: j.Liga, gls: j.Gls, ast: j.Ast,
      idade: j.Idade, CA: j.CA, CP: j.CP, salario: j.Salario, VP: j.VP });
    clubesSet.add(j.Clube);
    totalGolos += j.Gls; totalAst += j.Ast;
  }
  if (!porEpoca.length) return null;
  return { nome, totalGolos, totalAst, porEpoca, clubes: [...clubesSet] };
}

export interface CountryProfile {
  nome: string;
  clubes: Array<{ clube: string; liga: string }>;
  posicoes: Array<{ epoca: string; clube: string; divisao: number; pos: number; inf: string; pts: number }>;
  campeao: Marker[];
  promovido: Marker[];
  quaseSubida: Marker[];
  quaseTitulo: Marker[];
  despromovido: Marker[];
}

export function buildCountryProfile(seasons: NormSeason[], pais: string): CountryProfile | null {
  const sorted = [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
  const posicoes: CountryProfile["posicoes"] = [];
  const clubesSet = new Map<string, string>();
  const campeao: Marker[] = [], promovido: Marker[] = [], quaseSubida: Marker[] = [],
    quaseTitulo: Marker[] = [], despromovido: Marker[] = [];

  for (const s of sorted) {
    // Find all teams from this country
    const equipasDosPais = Array.from(s.equipasPais.entries())
      .filter(([_, p]) => p === pais)
      .map(([e]) => e);

    for (const equipa of equipasDosPais) {
      const r = s.rankings.find((x) => x.Equipa === equipa);
      if (r) {
        // Get liga for this team
        const j = s.jogadores.find((jj) => jj.Clube === equipa);
        const liga = j?.Liga || "";
        clubesSet.set(equipa, liga);

        posicoes.push({ epoca: s.epoca, clube: equipa, divisao: r.Divisao, pos: r.Pos, inf: r.Inf, pts: r.Pts });
        const m: Marker = { epoca: s.epoca, divisao: r.Divisao, pos: r.Pos, clube: equipa };
        if (isC(r.Inf)) campeao.push(m);
        if (isP(r.Inf)) promovido.push(m);
        if (isD(r.Inf)) despromovido.push(m);
        if (r.Divisao > 1 && r.Pos >= 2 && r.Pos <= 5 && !isP(r.Inf)) quaseSubida.push(m);
        if (r.Divisao === 1 && r.Pos <= 2 && !isC(r.Inf)) quaseTitulo.push(m);
      }
    }
  }

  if (!posicoes.length) return null;
  const clubes = Array.from(clubesSet.entries()).map(([club, liga]) => ({ clube: club, liga }));
  return { nome: pais, clubes, posicoes, campeao, promovido, quaseSubida, quaseTitulo, despromovido };
}