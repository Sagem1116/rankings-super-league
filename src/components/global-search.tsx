import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useFMStore } from "@/lib/store";
import { Trophy, User2, UserSquare2, Globe } from "lucide-react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { seasons } = useFMStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { clubes, jogadores, treinadores, paises } = useMemo(() => {
    const clubes = new Set<string>();
    const jogadores = new Set<string>();
    const treinadores = new Set<string>();
    const paises = new Set<string>();
    seasons.forEach((s) => {
      s.rankings.forEach((r) => clubes.add(r.Equipa));
      s.jogadores.forEach((j) => jogadores.add(j.Nome));
      s.treinadores.forEach((t) => treinadores.add(t.Nome));
      s.equipasPais.forEach((p) => paises.add(p));
    });
    return {
      clubes: [...clubes].sort(),
      jogadores: [...jogadores].sort(),
      treinadores: [...treinadores].sort(),
      paises: [...paises].sort(),
    };
  }, [seasons]);

  function go(path: string) {
    setOpen(false);
    navigate({ to: path });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar clubes, jogadores, treinadores, países... (Cmd+K)" />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>
        {!seasons.length && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Carrega um dataset para activar a pesquisa global.
          </div>
        )}
        {clubes.length > 0 && (
          <CommandGroup heading="Clubes">
            {clubes.slice(0, 50).map((c) => (
              <CommandItem key={`c-${c}`} value={`clube ${c}`} onSelect={() => go(`/perfil/clube/${encodeURIComponent(c)}`)}>
                <Trophy className="text-violet-400" /> {c}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {jogadores.length > 0 && (
          <CommandGroup heading="Jogadores">
            {jogadores.slice(0, 50).map((j) => (
              <CommandItem key={`j-${j}`} value={`jogador ${j}`} onSelect={() => go(`/perfil/jogador/${encodeURIComponent(j)}`)}>
                <User2 className="text-fuchsia-400" /> {j}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {treinadores.length > 0 && (
          <CommandGroup heading="Treinadores">
            {treinadores.slice(0, 50).map((t) => (
              <CommandItem key={`t-${t}`} value={`treinador ${t}`} onSelect={() => go(`/perfil/treinador/${encodeURIComponent(t)}`)}>
                <UserSquare2 className="text-teal-400" /> {t}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {paises.length > 0 && (
          <CommandGroup heading="Países">
            {paises.slice(0, 50).map((p) => (
              <CommandItem key={`p-${p}`} value={`pais ${p}`} onSelect={() => go(`/perfil/pais/${encodeURIComponent(p)}`)}>
                <Globe className="text-amber-400" /> {p}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function GlobalSearchTrigger() {
  return (
    <button
      onClick={() => {
        const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
        window.dispatchEvent(ev);
      }}
      className="hidden md:inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-[#110a2e]/95 px-4 py-2 text-sm text-slate-300 hover:bg-violet-500/15"
    >
      <span>🔍 Pesquisar...</span>
      <kbd className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs">⌘K</kbd>
    </button>
  );
}
