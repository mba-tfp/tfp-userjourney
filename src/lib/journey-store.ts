import { useEffect, useState, useCallback } from "react";
import { seedDoc, type JourneyDoc, type Cell, newId } from "./journey-data";

const KEY = "otto-journey-doc-v1";

function load(): JourneyDoc {
  if (typeof window === "undefined") return seedDoc;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedDoc;
    const parsed = JSON.parse(raw) as JourneyDoc;
    // Backfill stage.value from seed (by index) for docs saved before this field existed
    parsed.stages = parsed.stages.map((s, i) => ({
      ...s,
      value: s.value ?? seedDoc.stages[i]?.value,
    }));
    // Drop the legacy Sentiment lens from cached docs
    const sentiment = parsed.lenses.find((l) => l.name.toLowerCase() === "sentiment");
    if (sentiment) {
      parsed.lenses = parsed.lenses.filter((l) => l.id !== sentiment.id);
      delete parsed.cells[sentiment.id];
    }
    return parsed;
  } catch {
    return seedDoc;
  }
}

export function useJourney() {
  const [doc, setDoc] = useState<JourneyDoc>(seedDoc);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDoc(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(doc));
  }, [doc, hydrated]);

  const update = useCallback((fn: (d: JourneyDoc) => JourneyDoc) => {
    setDoc((d) => fn(structuredClone(d)));
  }, []);

  const api = {
    doc,
    hydrated,
    setTitle: (title: string) => update((d) => ({ ...d, title })),
    setStage: (id: string, patch: Partial<JourneyDoc["stages"][number]>) =>
      update((d) => {
        const i = d.stages.findIndex((s) => s.id === id);
        if (i >= 0) d.stages[i] = { ...d.stages[i], ...patch };
        return d;
      }),
    setLens: (id: string, name: string) =>
      update((d) => {
        const i = d.lenses.findIndex((l) => l.id === id);
        if (i >= 0) d.lenses[i].name = name;
        return d;
      }),
    setCell: (lensId: string, stageId: string, cell: Cell) =>
      update((d) => {
        d.cells[lensId] = d.cells[lensId] || {};
        d.cells[lensId][stageId] = cell;
        return d;
      }),
    addStage: (afterIndex?: number) =>
      update((d) => {
        const stage = {
          id: newId("s"),
          emoji: "✨",
          title: "New Stage",
          subtitle: "Describe this stage",
        };
        const idx = afterIndex === undefined ? d.stages.length : afterIndex + 1;
        d.stages.splice(idx, 0, stage);
        for (const lens of d.lenses) {
          d.cells[lens.id] = d.cells[lens.id] || {};
          d.cells[lens.id][stage.id] = { lines: [{ text: "" }] };
        }
        return d;
      }),
    deleteStage: (id: string) =>
      update((d) => {
        d.stages = d.stages.filter((s) => s.id !== id);
        for (const lens of d.lenses) delete d.cells[lens.id]?.[id];
        return d;
      }),
    moveStage: (id: string, dir: -1 | 1) =>
      update((d) => {
        const i = d.stages.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.stages.length) return d;
        [d.stages[i], d.stages[j]] = [d.stages[j], d.stages[i]];
        return d;
      }),
    addLens: () =>
      update((d) => {
        const lens = { id: newId("l"), name: "New Lens" };
        d.lenses.push(lens);
        d.cells[lens.id] = {};
        for (const s of d.stages) d.cells[lens.id][s.id] = { lines: [{ text: "" }] };
        return d;
      }),
    deleteLens: (id: string) =>
      update((d) => {
        d.lenses = d.lenses.filter((l) => l.id !== id);
        delete d.cells[id];
        return d;
      }),
    moveLens: (id: string, dir: -1 | 1) =>
      update((d) => {
        const i = d.lenses.findIndex((l) => l.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.lenses.length) return d;
        [d.lenses[i], d.lenses[j]] = [d.lenses[j], d.lenses[i]];
        return d;
      }),
    reset: () => setDoc(seedDoc),
    importDoc: (next: JourneyDoc) => setDoc(next),
  };

  return api;
}