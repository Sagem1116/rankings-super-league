import { useRef, useState } from "react";
import { Upload, Loader2, FileSpreadsheet, Download, Trash2, History, AlertTriangle, XCircle, CheckCircle2, ChevronDown, ChevronRight, FileJson, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { useFMStore } from "@/lib/store";
import { parseWorkbook } from "@/lib/parse-excel";
import { computeAll, normalizeSeason } from "@/lib/calc/engine";
import { exportAllToExcel } from "@/lib/export-excel";
import { validateRawSheets, summarize, type ImportValidation } from "@/lib/validate-import";
import { buildExportPayload, downloadJSON, parseImportPayload } from "@/lib/json-io";


export function UploadPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; epoca: string }[]>([]);
  const [epoca, setEpoca] = useState(String(new Date().getFullYear()));
  const { modoAtivo, setModo, isProcessing, setProcessing, setSeasonsAndResults, resultados, seasons, ultimaEpoca, reset } =
    useFMStore();
  const [drag, setDrag] = useState(false);
  const [acumular, setAcumular] = useState(true);
  const [validations, setValidations] = useState<ImportValidation[]>([]);
  const [openValidation, setOpenValidation] = useState<string | null>(null);


  const guessSeasonFromFilename = (name: string) => {
    const match = name.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "";
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const items = Array.from(list).map((f) => ({
      file: f,
      epoca: guessSeasonFromFilename(f.name) || epoca,
    }));
    setFiles((p) => [...p, ...items]);
  };

  const process = async () => {
    if (!files.length) return toast.error("Carrega pelo menos um ficheiro Excel.");
    setProcessing(true);
    try {
      // 1. Parse + validate cada ficheiro
      const parsed = await Promise.all(
        files.map(async ({ file, epoca }) => ({
          file, epoca, raw: await parseWorkbook(file),
        })),
      );
      const newValidations = parsed.map((p) => validateRawSheets(p.raw, p.epoca, p.file.name));
      setValidations(newValidations);

      const totalErrors = newValidations.reduce((a, v) => a + summarize(v).errors, 0);
      const totalWarnings = newValidations.reduce((a, v) => a + summarize(v).warnings, 0);

      if (totalErrors > 0) {
        toast.error(`${totalErrors} erro(s) crítico(s) detetado(s). Corrige os ficheiros antes de processar.`);
        // Abrir automaticamente o primeiro com erros
        const firstBad = newValidations.find((v) => summarize(v).errors > 0);
        if (firstBad) setOpenValidation(firstBad.fileName);
        setProcessing(false);
        return;
      }
      if (totalWarnings > 0) {
        toast.warning(`${totalWarnings} aviso(s) de dados em falta. Processado mesmo assim — revê o painel.`);
      }

      // 2. Normalizar + computar
      const novasSeasons = parsed.map((p) => normalizeSeason(p.raw, p.epoca));
      const epocasNovas = new Set(novasSeasons.map((s) => s.epoca));
      const base = acumular ? seasons.filter((s) => !epocasNovas.has(s.epoca)) : [];
      const merged = [...base, ...novasSeasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
      const resultados = computeAll(merged, modoAtivo);
      setSeasonsAndResults(merged, resultados, merged[merged.length - 1].epoca);
      setFiles([]);
      if (totalWarnings === 0) {
        toast.success(
          acumular
            ? `${novasSeasons.length} época(s) adicionada(s). Total: ${merged.length} época(s).`
            : `Processado: ${novasSeasons.length} época(s).`,
        );
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro a processar: " + (e?.message ?? e));
    } finally {
      setProcessing(false);
    }
  };

  const exportAll = async () => {
    if (!Object.keys(resultados).length) return toast.error("Nada para exportar. Processa primeiro.");
    try {
      await exportAllToExcel(resultados);
      toast.success("Excel exportado.");
    } catch (e: any) {
      toast.error("Erro a exportar: " + (e?.message ?? e));
    }
  };

  const exportJSON = () => {
    if (!Object.keys(resultados).length) return toast.error("Nada para exportar. Processa primeiro.");
    try {
      const payload = buildExportPayload(seasons, resultados, ultimaEpoca, modoAtivo);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJSON(payload, `fmdatalab-rankings-${stamp}.json`);
      toast.success(`JSON exportado (${seasons.length} época(s), ${Object.keys(resultados).length} tabela(s)).`);
    } catch (e: any) {
      toast.error("Erro a exportar JSON: " + (e?.message ?? e));
    }
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const { seasons: s, resultados: r, ultimaEpoca: ep, modoAtivo: m } = parseImportPayload(text);
      if (m) setModo(m);
      setSeasonsAndResults(s, r, ep);
      toast.success(`JSON importado: ${s.length} época(s), ${Object.keys(r).length} tabela(s).`);
    } catch (e: any) {
      toast.error("Erro a importar JSON: " + (e?.message ?? e));
    }
  };


  const epocasGuardadas = seasons.map((s) => s.epoca).sort();

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        {(["rankings", "treinadores", "jogadores"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={modoAtivo[k]}
              onChange={(e) => setModo({ [k]: e.target.checked })}
              className="h-4 w-4 accent-violet-400"
            />
            <span className="capitalize">{k === "rankings" ? "Rankings de Clubes / Países" : k === "treinadores" ? "Rankings de Treinadores" : "Stats de Jogadores"}</span>
          </label>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Época</label>
          <input
            value={epoca}
            onChange={(e) => setEpoca(e.target.value)}
            className="w-24 rounded-md border border-border bg-input px-2 py-1 text-foreground"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acumular}
            onChange={(e) => setAcumular(e.target.checked)}
            className="h-4 w-4 accent-violet-400"
          />
          <History className="h-3.5 w-3.5 text-violet-200" />
          <span>Acumular épocas (manter histórico)</span>
        </label>
        {epocasGuardadas.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {epocasGuardadas.length} época(s) em memória: {epocasGuardadas.join(", ")}
            </span>
            <button
              onClick={() => { reset(); toast.success("Histórico limpo."); }}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-destructive/60 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> Limpar histórico
            </button>
          </>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${drag ? "border-violet-400 bg-secondary/40" : "border-border"}`}
      >
        <Upload className="h-8 w-8 text-violet-300" />
        <p className="text-sm">Arrasta ficheiros .xlsx ou clica para escolher</p>
        <input ref={fileRef} type="file" accept=".xlsx" multiple hidden
          onChange={(e) => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="space-y-1 text-sm">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-1">
              <FileSpreadsheet className="h-4 w-4 text-violet-300" />
              <span className="flex-1 truncate">{f.file.name}</span>
              <input
                value={f.epoca}
                onChange={(e) => setFiles((p) => p.map((x, j) => j === i ? { ...x, epoca: e.target.value } : x))}
                className="w-20 rounded border border-border bg-input px-2 py-0.5 text-xs"
              />
              <button onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((_, j) => j !== i)); }}
                className="text-xs text-destructive">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={process}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-md bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:brightness-110 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Processar
        </button>
        <button
          onClick={exportAll}
          className="inline-flex items-center gap-2 rounded-md border border-violet-400 px-4 py-2 text-sm text-violet-200 hover:bg-violet-400/10"
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </button>
        <button
          onClick={exportJSON}
          className="inline-flex items-center gap-2 rounded-md border border-violet-400 px-4 py-2 text-sm text-violet-200 hover:bg-violet-400/10"
          title="Exportar todos os rankings como JSON (use noutras apps)"
        >
          <FileJson className="h-4 w-4" /> Exportar JSON
        </button>
        <button
          onClick={() => jsonRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-violet-400 px-4 py-2 text-sm text-violet-200 hover:bg-violet-400/10"
          title="Importar rankings previamente exportados como JSON"
        >
          <UploadIcon className="h-4 w-4" /> Importar JSON
        </button>
        <input
          ref={jsonRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJSON(f);
            if (jsonRef.current) jsonRef.current.value = "";
          }}
        />

        {validations.length > 0 && (
          <button
            onClick={() => setValidations([])}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar relatório
          </button>
        )}
      </div>

      {validations.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
          <div className="text-sm font-semibold">Relatório de validação dos imports</div>
          {validations.map((v) => {
            const { errors, warnings } = summarize(v);
            const ok = errors === 0 && warnings === 0;
            const open = openValidation === v.fileName;
            return (
              <div key={v.fileName} className="rounded-md border border-border/60">
                <button
                  onClick={() => setOpenValidation(open ? null : v.fileName)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/40"
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : errors > 0 ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="flex-1 truncate">{v.fileName} <span className="text-xs text-muted-foreground">({v.epoca})</span></span>
                  {errors > 0 && <span className="text-xs text-destructive">{errors} erro(s)</span>}
                  {warnings > 0 && <span className="text-xs text-amber-400">{warnings} aviso(s)</span>}
                  {ok && <span className="text-xs text-emerald-400">OK</span>}
                </button>
                {open && v.issues.length > 0 && (
                  <ul className="max-h-64 space-y-1 overflow-auto border-t border-border/60 px-3 py-2 text-xs">
                    {v.issues.map((iss, idx) => (
                      <li
                        key={idx}
                        className={`flex gap-2 ${iss.level === "error" ? "text-destructive" : "text-amber-300"}`}
                      >
                        <span className="font-mono opacity-70">[{iss.sheet}]</span>
                        <span>{iss.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {open && v.issues.length === 0 && (
                  <div className="border-t border-border/60 px-3 py-2 text-xs text-emerald-300">
                    Sem problemas detetados.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
