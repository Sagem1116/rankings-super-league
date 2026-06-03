import { create } from "zustand";
import type { ModoAtivo, RankingTable } from "./types";
import type { NormSeason } from "./calc/engine";

interface State {
  modoAtivo: ModoAtivo;
  setModo: (m: Partial<ModoAtivo>) => void;
  seasons: NormSeason[];
  resultados: Record<string, RankingTable>;
  isProcessing: boolean;
  ultimaEpoca: string;
  setSeasonsAndResults: (seasons: NormSeason[], resultados: Record<string, RankingTable>, epoca: string) => void;
  setProcessing: (b: boolean) => void;
  reset: () => void;
}

// We deliberately do NOT persist to localStorage — large Excel uploads exceed
// the ~5MB quota and would crash with "exceeded the quota" errors.
export const useFMStore = create<State>((set) => ({
  modoAtivo: { rankings: true, treinadores: true, jogadores: true },
  setModo: (m) => set((s) => ({ modoAtivo: { ...s.modoAtivo, ...m } })),
  seasons: [],
  resultados: {},
  isProcessing: false,
  ultimaEpoca: "",
  setSeasonsAndResults: (seasons, resultados, epoca) =>
    set({ seasons, resultados, ultimaEpoca: epoca }),
  setProcessing: (b) => set({ isProcessing: b }),
  reset: () => set({ seasons: [], resultados: {}, ultimaEpoca: "" }),
}));