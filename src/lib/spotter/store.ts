import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dismissedKeys, scanText } from "./scan";
import { applyRewriteToText } from "./suggestions";
import type { ForensicReport, ScanReport } from "./types";

interface SpotterState {
  scans: ScanReport[];
  activeId: string | null;
  addScan: (scan: ScanReport) => void;
  setActive: (id: string | null) => void;
  removeScan: (id: string) => void;
  attachForensic: (id: string, forensic: ForensicReport) => void;
  attachRewrites: (id: string, rewrites: { id: string; rewrite: string }[]) => void;
  dismissSuggestion: (scanId: string, suggestionId: string) => void;
  acceptSuggestion: (scanId: string, suggestionId: string) => void;
}

function withSuggestions(scan: ScanReport): ScanReport {
  if (Array.isArray(scan.suggestions) && Array.isArray(scan.acceptedSkip)) return scan;
  return {
    ...scan,
    suggestions: Array.isArray(scan.suggestions) ? scan.suggestions : [],
    acceptedSkip: Array.isArray(scan.acceptedSkip) ? scan.acceptedSkip : [],
  };
}

export const useSpotterStore = create<SpotterState>()(
  persist(
    (set) => ({
      scans: [],
      activeId: null,
      addScan: (scan) =>
        set((s) => ({
          scans: [withSuggestions(scan), ...s.scans].slice(0, 40),
          activeId: scan.id,
        })),
      setActive: (id) => set({ activeId: id }),
      removeScan: (id) =>
        set((s) => ({
          scans: s.scans.filter((x) => x.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      attachForensic: (id, forensic) =>
        set((s) => ({
          scans: s.scans.map((x) => (x.id === id ? { ...x, forensic } : x)),
        })),
      attachRewrites: (id, rewrites) =>
        set((s) => ({
          scans: s.scans.map((x) => {
            if (x.id !== id) return x;
            const map = new Map(rewrites.map((r) => [r.id, r.rewrite]));
            return {
              ...x,
              suggestions: (x.suggestions ?? []).map((sug) =>
                map.has(sug.id) && sug.status === "open"
                  ? { ...sug, rewrite: map.get(sug.id) ?? sug.rewrite }
                  : sug,
              ),
            };
          }),
        })),
      dismissSuggestion: (scanId, suggestionId) =>
        set((s) => ({
          scans: s.scans.map((x) =>
            x.id === scanId
              ? {
                  ...x,
                  suggestions: (x.suggestions ?? []).map((sug) =>
                    sug.id === suggestionId ? { ...sug, status: "dismissed" as const } : sug,
                  ),
                }
              : x,
          ),
        })),
      acceptSuggestion: (scanId, suggestionId) =>
        set((s) => ({
          scans: s.scans.map((x) => {
            if (x.id !== scanId) return x;
            const sug = (x.suggestions ?? []).find((g) => g.id === suggestionId);
            if (!sug || sug.status !== "open") return x;
            const nextText = applyRewriteToText(x.text, sug);
            const skip = [...(x.acceptedSkip ?? [])];
            if (sug.rewrite.trim()) skip.push(sug.rewrite.toLowerCase().slice(0, 80));
            const next = scanText({
              text: nextText,
              title: x.title,
              source: x.source,
              sourceKind: x.sourceKind,
              id: x.id,
              createdAt: x.createdAt,
              keepDismissed: dismissedKeys(x.suggestions ?? []),
              acceptedSkip: skip,
            });
            next.forensic = x.forensic;
            return next;
          }),
        })),
    }),
    { name: "paper-spotter-v2" },
  ),
);

export function useActiveScan(): ScanReport | null {
  return useSpotterStore((s) => s.scans.find((x) => x.id === s.activeId) ?? null);
}
