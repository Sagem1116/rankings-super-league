import { useRef, useState } from "react";
import { Upload, Loader2, FileSpreadsheet, Download, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { useFMStore } from "@/lib/store";
import { parseWorkbook } from "@/lib/parse-excel";
import { computeAll, normalizeSeason } from "@/lib/calc/engine";
import { exportAllToExcel } from "@/lib/export-excel";

export function UploadPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; epoca: string }[]>([]);
  const [epoca, setEpoca] = useState(String(new Date().getFullYear()));
  const { modoAtivo, setModo, isProcessing, setProcessing, setSeasonsAndResults, resultados, seasons, reset } =
    useFMStore();
  const [drag, setDrag] = useState(false);
  const [acumular, setAcumular] = useState(true);

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
      const novasSeasons = await Promise.all(
        files.map(async ({ file, epoca }) => normalizeSeason(await parseWorkbook(file), epoca)),
      );
      // Acumular: manter épocas anteriores; substituir as que tenham mesma "epoca".
      const epocasNovas = new Set(novasSeasons.map((s) => s.epoca));
      const base = acumular ? seasons.filter((s) => !epocasNovas.has(s.epoca)) : [];
      const merged = [...base, ...novasSeasons].sort((a, b) => a.epoca.localeCompare(b.epoca));
      const resultados = computeAll(merged, modoAtivo);
      setSeasonsAndResults(merged, resultados, merged[merged.length - 1].epoca);
      setFiles([]);
      toast.success(
        acumular
          ? `${novasSeasons.length} época(s) adicionada(s). Total: ${merged.length} época(s).`
          : `Processado: ${novasSeasons.length} época(s).`,
      );
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

      <div className="flex gap-2">
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
          <Download className="h-4 w-4" /> Exportar tudo para Excel
        </button>
      </div>
    </div>
  );
}