import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFMStore } from "@/lib/store";

export const Route = createFileRoute("/debug")({
  head: () => ({
    meta: [
      { title: "Debug — FMDataLab" },
      { name: "description", content: "Rastreamento detalhado dos cálculos: pontos por ranking e clubes sem treinador." },
    ],
  }),
  component: DebugPage,
});

const COEF_WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2];

function tokens(inf: string) {
  return new Set(String(inf || "").toUpperCase().split(/[\s,;/|+]+/).filter(Boolean));
}
const isC = (inf: string) => tokens(inf).has("C");
const isP = (inf: string) => tokens(inf).has("P");
const isD = (inf: string) => tokens(inf).has("D");

function bonusFor(inf: string, pos: number): number {
  let b = 0;
  if (isC(inf)) b += 10;
  if (isP(inf)) b += 4;
  if (pos >= 2 && pos <= 5) b += 3;
  return b;
}

type Tab = "pontos" | "clubes" | "treinadores";

function DebugPage() {
  const { seasons } = useFMStore();
  const [tab, setTab] = useState<Tab>("pontos");
  const [epocaSel, setEpocaSel] = useState<string>("__all");
  const [filtro, setFiltro] = useState("");

  const sortedSeasons = useMemo(
    () => [...seasons].sort((a, b) => a.epoca.localeCompare(b.epoca)),
    [seasons],
  );
  const epochs = sortedSeasons.map((s) => s.epoca);
  const last5 = epochs.slice(-5).reverse();
  const pesosFixos = sortedSeasons[0]?.pesosFixos ?? new Map<number, number>();

  // Per-season trainer lookup (clube -> {nome,nac})
  const trainersByEp = useMemo(() => {
    const m = new Map<string, Map<string, { nome: string; nac: string }>>();
    for (const s of sortedSeasons) {
      const inner = new Map<string, { nome: string; nac: string }>();
      for (const t of s.treinadores) {
        if (t.Clube && t.Nome) inner.set(t.Clube, { nome: t.Nome, nac: t.Nac });
      }
      m.set(s.epoca, inner);
    }
    return m;
  }, [sortedSeasons]);

  /* ---------------- DEBUG PONTOS ---------------- */
  const pontosRows = useMemo(() => {
    const out: any[] = [];
    const filteredSeasons = epocaSel === "__all"
      ? sortedSeasons
      : sortedSeasons.filter((s) => s.epoca === epocaSel);
    for (const s of filteredSeasons) {
      const last5Idx = last5.indexOf(s.epoca);
      const coefWeight = last5Idx >= 0 ? COEF_WEIGHTS[last5Idx] : 0;
      const trainerMap = trainersByEp.get(s.epoca) ?? new Map();
      for (const r of s.rankings) {
        const wFixo = pesosFixos.get(r.Divisao) ?? 1;
        const bonus = bonusFor(r.Inf, r.Pos);
        const baseCoefFixo = r.Pts * wFixo + bonus;
        const contribCoefFixo = baseCoefFixo * coefWeight;
        const tr = trainerMap.get(r.Equipa);
        const pais = s.equipasPais.get(r.Equipa) || "—";
        out.push({
          Epoca: s.epoca,
          Equipa: r.Equipa,
          Div: r.Divisao,
          Pos: r.Pos,
          Inf: r.Inf || "",
          Pts: r.Pts,
          PesoFixo: wFixo,
          PtsFixos: +(r.Pts * wFixo).toFixed(2),
          Bonus: bonus,
          BaseCoefFixo: +baseCoefFixo.toFixed(2),
          PesoTemporal: coefWeight,
          ContribCoefFixo: +contribCoefFixo.toFixed(2),
          Treinador: tr?.nome || "— (sem treinador)",
          NacTreinador: tr?.nac || "",
          Pais: pais,
        });
      }
    }
    const f = filtro.trim().toLowerCase();
    if (!f) return out;
    return out.filter((r) =>
      String(r.Equipa).toLowerCase().includes(f) ||
      String(r.Treinador).toLowerCase().includes(f) ||
      String(r.Pais).toLowerCase().includes(f) ||
      String(r.Epoca).toLowerCase().includes(f),
    );
  }, [sortedSeasons, epocaSel, last5, pesosFixos, trainersByEp, filtro]);

  /* ---------------- DEBUG CLUBES ---------------- */
  const clubesRows = useMemo(() => {
    const out: any[] = [];
    const filteredSeasons = epocaSel === "__all"
      ? sortedSeasons
      : sortedSeasons.filter((s) => s.epoca === epocaSel);
    for (const s of filteredSeasons) {
      const trainerMap = trainersByEp.get(s.epoca) ?? new Map();
      for (const r of s.rankings) {
        const tr = trainerMap.get(r.Equipa);
        if (tr) continue; // só clubes SEM treinador
        out.push({
          Epoca: s.epoca,
          Equipa: r.Equipa,
          Div: r.Divisao,
          Pos: r.Pos,
          Inf: r.Inf || "",
          Campeao: isC(r.Inf) ? "✅" : "—",
          Promovido: isP(r.Inf) ? "✅" : "—",
          Despromovido: isD(r.Inf) ? "✅" : "—",
          Pais: s.equipasPais.get(r.Equipa) || "—",
          Pts: r.Pts,
          // impacto: estes clubes não contribuem para o ranking de treinadores
          ImpactoRankingTreinador: "ignorado",
        });
      }
    }
    const f = filtro.trim().toLowerCase();
    if (!f) return out;
    return out.filter((r) =>
      String(r.Equipa).toLowerCase().includes(f) ||
      String(r.Pais).toLowerCase().includes(f) ||
      String(r.Epoca).toLowerCase().includes(f),
    );
  }, [sortedSeasons, epocaSel, trainersByEp, filtro]);

  const clubesStats = useMemo(() => {
    const totalRanking = clubesRows.length;
    const campeoes = clubesRows.filter((r) => r.Campeao === "✅").length;
    const promovidos = clubesRows.filter((r) => r.Promovido === "✅").length;
    const epocasComProblemas = new Set(clubesRows.map((r) => r.Epoca)).size;
    return { totalRanking, campeoes, promovidos, epocasComProblemas };
  }, [clubesRows]);

  /* ---------------- DEBUG TREINADORES ---------------- */
  const treinadoresRows = useMemo(() => {
    const out: any[] = [];
    const filteredSeasons = epocaSel === "__all"
      ? sortedSeasons
      : sortedSeasons.filter((s) => s.epoca === epocaSel);
    for (const s of filteredSeasons) {
      const last5Idx = last5.indexOf(s.epoca);
      const coefWeight = last5Idx >= 0 ? COEF_WEIGHTS[last5Idx] : 0;
      const trainerMap = trainersByEp.get(s.epoca) ?? new Map();
      for (const r of s.rankings) {
        const tr = trainerMap.get(r.Equipa);
        if (!tr) continue; // só linhas que contribuem para rankings de treinadores
        const wFixo = pesosFixos.get(r.Divisao) ?? 1;
        const bonus = bonusFor(r.Inf, r.Pos);
        const ptsFixos = +(r.Pts * wFixo).toFixed(2);
        const baseCoef = r.Pts + bonus;
        const baseCoefFixo = r.Pts * wFixo + bonus;
        const contribCoef = +(baseCoef * coefWeight).toFixed(2);
        const contribCoefFixo = +(baseCoefFixo * coefWeight).toFixed(2);
        out.push({
          Epoca: s.epoca,
          Treinador: tr.nome,
          Nac: tr.nac || "—",
          Equipa: r.Equipa,
          Div: r.Divisao,
          Pos: r.Pos,
          Inf: r.Inf || "",
          Pts: r.Pts,
          PesoFixo: wFixo,
          Bonus: bonus,
          // → Ranking_Treinador (Pts crus, somados ao Total)
          R_Treinador: r.Pts,
          // → Ranking_Treinador_Fixos (Pts × pesoFixo)
          R_Treinador_Fixos: ptsFixos,
          // → Treinador_Coef base (Pts + bónus) e contribuição (× peso temporal)
          BaseCoef: +baseCoef.toFixed(2),
          ContribCoef: contribCoef,
          // → Treinador_Coef_Fixos base (Pts × peso + bónus) e contribuição
          BaseCoefFixo: +baseCoefFixo.toFixed(2),
          ContribCoefFixo: contribCoefFixo,
          // → Ranking_Treinador_Pais / _Fixo (atribuído à nacionalidade)
          R_TreinadorPais: r.Pts,
          R_TreinadorPaisFixos: ptsFixos,
          // títulos para Treinador_Campeoes / Play-Off
          Campeao: isC(r.Inf) ? "✅" : "—",
          Promovido: isP(r.Inf) ? "✅" : "—",
          PesoTemporal: coefWeight,
        });
      }
    }
    const f = filtro.trim().toLowerCase();
    if (!f) return out;
    return out.filter((r) =>
      String(r.Treinador).toLowerCase().includes(f) ||
      String(r.Equipa).toLowerCase().includes(f) ||
      String(r.Nac).toLowerCase().includes(f) ||
      String(r.Epoca).toLowerCase().includes(f),
    );
  }, [sortedSeasons, epocaSel, last5, pesosFixos, trainersByEp, filtro]);

  const treinadoresStats = useMemo(() => {
    const treinadoresUnicos = new Set(treinadoresRows.map((r) => r.Treinador)).size;
    const nacionalidades = new Set(treinadoresRows.map((r) => r.Nac).filter((n) => n && n !== "—")).size;
    const totalRT = treinadoresRows.reduce((a, r) => a + (Number(r.R_Treinador) || 0), 0);
    const totalRTF = treinadoresRows.reduce((a, r) => a + (Number(r.R_Treinador_Fixos) || 0), 0);
    const totalCoef = treinadoresRows.reduce((a, r) => a + (Number(r.ContribCoef) || 0), 0);
    const totalCoefFixo = treinadoresRows.reduce((a, r) => a + (Number(r.ContribCoefFixo) || 0), 0);
    return { treinadoresUnicos, nacionalidades, totalRT, totalRTF, totalCoef, totalCoefFixo };
  }, [treinadoresRows]);

  if (!seasons.length) {
    return (
      <div className="rounded-[2rem] glow-panel p-10 text-center">
        <p className="text-slate-300">Carrega um dataset para usar a página de debug.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/30">Ir para upload</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] glow-panel p-6">
        <h1 className="text-2xl font-bold text-white glow-heading">Debug</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rastreamento detalhado de como cada linha do ranking contribui para os pontos de clubes,
          treinadores e países — e validação dos clubes sem treinador associado.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="flex rounded-full border border-violet-500/20 bg-[#100b26] p-1">
            <button
              onClick={() => setTab("pontos")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "pontos" ? "bg-violet-500/30 text-white" : "text-slate-300 hover:text-white"}`}
            >
              Debug Pontos
            </button>
            <button
              onClick={() => setTab("clubes")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "clubes" ? "bg-violet-500/30 text-white" : "text-slate-300 hover:text-white"}`}
            >
              Debug Clubes
            </button>
            <button
              onClick={() => setTab("treinadores")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "treinadores" ? "bg-violet-500/30 text-white" : "text-slate-300 hover:text-white"}`}
            >
              Debug Treinadores
            </button>
          </div>

          <label className="text-sm text-slate-300">
            Época:
            <select
              value={epocaSel}
              onChange={(e) => setEpocaSel(e.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-[#0d1222] px-2 py-1 text-white"
            >
              <option value="__all">Todas</option>
              {epochs.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Filtro:
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="clube, treinador, país…"
              className="ml-2 w-56 rounded-lg border border-white/10 bg-[#0d1222] px-2 py-1 text-white"
            />
          </label>
        </div>
      </header>

      {tab === "pontos" && (
        <section className="space-y-3">
          <div className="rounded-[1.5rem] glow-panel p-4 text-sm text-slate-300">
            <p>
              Cada linha mostra, para uma <strong>(época, clube)</strong>, de onde vêm os pontos:
              <span className="ml-1 text-violet-200">Pts</span> brutos da folha Ranking,
              <span className="ml-1 text-violet-200">PesoFixo</span> da divisão (folha Pesos_Fixos),
              <span className="ml-1 text-violet-200">Bónus</span> por título/promoção/posição (C +10, P +4, 2º–5º +3),
              <span className="ml-1 text-violet-200">BaseCoefFixo</span> = Pts × PesoFixo + Bónus,
              <span className="ml-1 text-violet-200">PesoTemporal</span> (1.0/0.8/0.6/0.4/0.2 nas últimas 5 épocas, 0 fora),
              e <span className="text-violet-200">ContribCoefFixo</span> = BaseCoefFixo × PesoTemporal — exactamente o que entra no Coef. Clube (Fixos).
              O treinador e país mostram a quem essa linha é atribuída no ranking de treinadores/países.
            </p>
            <p className="mt-2 text-xs text-slate-400">Total de linhas: {pontosRows.length}</p>
          </div>
          <DebugTable
            columns={[
              { key: "Epoca", label: "Época" },
              { key: "Equipa", label: "Equipa" },
              { key: "Div", label: "Div", align: "right" },
              { key: "Pos", label: "Pos", align: "right" },
              { key: "Inf", label: "Inf" },
              { key: "Pts", label: "Pts", align: "right" },
              { key: "PesoFixo", label: "Peso Fixo", align: "right" },
              { key: "PtsFixos", label: "Pts×Peso", align: "right" },
              { key: "Bonus", label: "Bónus", align: "right" },
              { key: "BaseCoefFixo", label: "Base Coef", align: "right" },
              { key: "PesoTemporal", label: "Peso Temp.", align: "right" },
              { key: "ContribCoefFixo", label: "Contrib. Coef Fixos", align: "right" },
              { key: "Treinador", label: "Treinador" },
              { key: "NacTreinador", label: "Nac" },
              { key: "Pais", label: "País" },
            ]}
            rows={pontosRows}
          />
        </section>
      )}

      {tab === "clubes" && (
        <section className="space-y-3">
          <div className="rounded-[1.5rem] glow-panel p-4 text-sm text-slate-300">
            <p>
              Lista de <strong>clubes sem treinador associado</strong> na folha Treinadores
              numa determinada época. Estas linhas <strong>não contribuem para o ranking de
              treinadores nem para os rankings por nacionalidade do treinador</strong> — os pontos
              de clube e país continuam a contar normalmente.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label="Linhas sem treinador" value={clubesStats.totalRanking} />
              <Stat label="Campeões sem treinador" value={clubesStats.campeoes} accent={clubesStats.campeoes > 0} />
              <Stat label="Promovidos sem treinador" value={clubesStats.promovidos} accent={clubesStats.promovidos > 0} />
              <Stat label="Épocas afectadas" value={clubesStats.epocasComProblemas} />
            </div>
          </div>
          <DebugTable
            columns={[
              { key: "Epoca", label: "Época" },
              { key: "Equipa", label: "Equipa" },
              { key: "Div", label: "Div", align: "right" },
              { key: "Pos", label: "Pos", align: "right" },
              { key: "Inf", label: "Inf" },
              { key: "Campeao", label: "Campeão", align: "center" },
              { key: "Promovido", label: "Promovido", align: "center" },
              { key: "Despromovido", label: "Despromovido", align: "center" },
              { key: "Pais", label: "País" },
              { key: "Pts", label: "Pts", align: "right" },
              { key: "ImpactoRankingTreinador", label: "Ranking Treinador" },
            ]}
            rows={clubesRows}
            emptyMessage="✅ Sem problemas: todos os clubes têm treinador associado."
          />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${accent ? "border-amber-400/30 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/5 text-slate-200"}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

interface DebugCol { key: string; label: string; align?: "left" | "right" | "center" }
function DebugTable({ columns, rows, emptyMessage }: { columns: DebugCol[]; rows: any[]; emptyMessage?: string }) {
  if (!rows.length) {
    return (
      <div className="rounded-[1.5rem] glow-panel p-6 text-center text-sm text-slate-300">
        {emptyMessage || "Sem linhas para mostrar."}
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded-[1.5rem] glow-panel">
      <table className="min-w-full divide-y divide-white/10 text-xs">
        <thead className="sticky top-0 bg-slate-950/95 text-[10px] uppercase tracking-[0.16em] text-violet-300">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">
          {rows.slice(0, 5000).map((r, i) => (
            <tr key={i} className="hover:bg-violet-500/5">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-1.5 ${c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center" : "text-left"}`}>
                  {String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 5000 && (
        <div className="border-t border-white/10 px-4 py-2 text-center text-[11px] text-slate-400">
          A mostrar 5000 de {rows.length} linhas — filtra por época ou texto para refinar.
        </div>
      )}
    </div>
  );
}
