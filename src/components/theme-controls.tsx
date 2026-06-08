import { useEffect, useRef, useState } from "react";
import { Sliders, RotateCcw } from "lucide-react";

const KEY = "fm-theme-v1";
const THEMES = [
  { key: "gold", label: "Dark Orange" },
  { key: "neo", label: "Neon Dark" },
  { key: "neo-orange", label: "Neo Orange" },
  { key: "ember", label: "Sunset Noir" },
  { key: "cyber", label: "Cyber Glow" },
  { key: "holo", label: "Holo Futurista" },
] as const;

type Theme = (typeof THEMES)[number]["key"];
const DEFAULTS: { sat: number; bright: number; bg: number; theme: Theme } = { sat: 1, bright: 0, bg: 0, theme: "holo" };

type Settings = typeof DEFAULTS;

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    const theme = THEMES.some((t) => t.key === parsed.theme) ? parsed.theme : DEFAULTS.theme;
    return { ...DEFAULTS, ...parsed, theme };
  } catch { return DEFAULTS; }
}

function apply(s: Settings) {
  if (typeof document === "undefined") return;
  const r = document.documentElement.style;
  r.setProperty("--t-sat", String(s.sat));
  r.setProperty("--t-bright", String(s.bright));
  r.setProperty("--t-bg", String(s.bg));
  document.documentElement.dataset.theme = s.theme;
}

export function ThemeControls() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = load();
    setS(v); apply(v);
  }, []);

  useEffect(() => {
    apply(s);
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const Row = (props: { label: string; v: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{props.label}</span>
        <span className="tabular-nums text-violet-200">{props.v.toFixed(2)}{props.suffix ?? ""}</span>
      </div>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.v}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-400" />
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        title="Ajustar tema"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 text-[12px] font-medium text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-secondary/70">
        <Sliders className="h-3.5 w-3.5" /> Tema
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border/60 p-4 shadow-2xl"
          style={{ backgroundImage: "var(--gradient-surface)", boxShadow: "var(--shadow-elegant)" }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-violet-200">Tema</div>
            <button onClick={() => setS(DEFAULTS)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-200">
              <RotateCcw className="h-3 w-3" /> Repor
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                onClick={() => setS((p) => ({ ...p, theme: theme.key }))}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${theme.key === s.theme ? "border-violet-400 bg-violet-400/10 text-violet-200" : "border-border/60 bg-card/80 text-foreground"}`}>
                {theme.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Escolhe entre o tema atual e o novo estilo inspirado na imagem.</p>
          <div className="space-y-3 mt-4">
            <div className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-violet-200">Intensidade</div>
            <Row label="Saturação" v={s.sat} min={0.6} max={1.4} step={0.02}
              onChange={(v) => setS((p) => ({ ...p, sat: v }))} suffix="×" />
            <Row label="Brilho do texto" v={s.bright} min={-0.06} max={0.06} step={0.005}
              onChange={(v) => setS((p) => ({ ...p, bright: v }))} />
            <Row label="Brilho do fundo" v={s.bg} min={-0.03} max={0.08} step={0.005}
              onChange={(v) => setS((p) => ({ ...p, bg: v }))} />
          </div>
        </div>
      )}
    </div>
  );
}