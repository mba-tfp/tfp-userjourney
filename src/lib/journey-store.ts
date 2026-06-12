import { useEffect, useState, useCallback } from "react";
import {
  seedDoc,
  newId,
  type JourneyDoc,
  type Line,
  type Stage,
  type Tag,
  TAG_COLORS,
} from "./journey-data";

const KEY = "otto-journey-doc-v2";
const LEGACY_KEY = "otto-journey-doc-v1";

// Migrate a legacy v1 doc (lenses + cells) to v2 (tags + lines)
function migrateV1(legacy: any): JourneyDoc {
  const lensList: { id: string; name: string }[] = legacy?.lenses ?? [];
  const cells: Record<string, Record<string, { lines: { text: string; gap?: boolean }[] }>> =
    legacy?.cells ?? {};

  // Drop legacy Sentiment lens entirely
  const activeLenses = lensList.filter((l) => l.name.toLowerCase() !== "sentiment");

  // Map lens name -> seed tag id when names match, else create a new tag
  const tags: Tag[] = [...seedDoc.tags];
  const tagByLensId: Record<string, string> = {};
  const palette = TAG_COLORS;
  activeLenses.forEach((lens, i) => {
    const existing = tags.find((t) => t.name.toLowerCase() === lens.name.toLowerCase());
    if (existing) {
      tagByLensId[lens.id] = existing.id;
    } else {
      const t: Tag = { id: newId("t"), name: lens.name, color: palette[(tags.length + i) % palette.length] };
      tags.push(t);
      tagByLensId[lens.id] = t.id;
    }
  });

  const stages: Stage[] = (legacy?.stages ?? []).map((s: any, i: number) => ({
    id: s.id,
    emoji: s.emoji,
    title: s.title,
    subtitle: s.subtitle,
    value: s.value ?? seedDoc.stages[i]?.value,
  }));

  const lines: Record<string, Line[]> = {};
  stages.forEach((stage) => {
    const stageLines: Line[] = [];
    let counter = 1;
    activeLenses.forEach((lens) => {
      const cell = cells[lens.id]?.[stage.id];
      (cell?.lines ?? []).forEach((sl) => {
        if (!sl.text?.trim()) return;
        stageLines.push({
          id: `${stage.id}-ln-${counter++}`,
          text: sl.text.replace(/^✗\s+/, ""),
          tagId: tagByLensId[lens.id],
          exists: !sl.gap,
        });
      });
    });
    lines[stage.id] = stageLines;
  });

  return {
    title: legacy?.title ?? seedDoc.title,
    stages,
    tags,
    lines,
  };
}

function load(): JourneyDoc {
  if (typeof window === "undefined") return seedDoc;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as JourneyDoc;
    // One-shot migrate from v1
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateV1(JSON.parse(legacyRaw));
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return seedDoc;
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

  return {
    doc,
    hydrated,

    setTitle: (title: string) => update((d) => ({ ...d, title })),

    // Stage CRUD
    setStage: (id: string, patch: Partial<Stage>) =>
      update((d) => {
        const i = d.stages.findIndex((s) => s.id === id);
        if (i >= 0) d.stages[i] = { ...d.stages[i], ...patch };
        return d;
      }),
    addStage: (afterIndex?: number) =>
      update((d) => {
        const stage: Stage = {
          id: newId("s"),
          emoji: "✨",
          title: "New Stage",
          subtitle: "Describe this stage",
        };
        const idx = afterIndex === undefined ? d.stages.length : afterIndex + 1;
        d.stages.splice(idx, 0, stage);
        d.lines[stage.id] = [];
        return d;
      }),
    deleteStage: (id: string) =>
      update((d) => {
        d.stages = d.stages.filter((s) => s.id !== id);
        delete d.lines[id];
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

    // Line CRUD
    addLine: (stageId: string, exists: boolean) =>
      update((d) => {
        d.lines[stageId] = d.lines[stageId] ?? [];
        d.lines[stageId].push({ id: newId("ln"), text: "", exists });
        return d;
      }),
    updateLine: (stageId: string, lineId: string, patch: Partial<Line>) =>
      update((d) => {
        const arr = d.lines[stageId];
        if (!arr) return d;
        const i = arr.findIndex((l) => l.id === lineId);
        if (i >= 0) arr[i] = { ...arr[i], ...patch };
        return d;
      }),
    deleteLine: (stageId: string, lineId: string) =>
      update((d) => {
        if (!d.lines[stageId]) return d;
        d.lines[stageId] = d.lines[stageId].filter((l) => l.id !== lineId);
        return d;
      }),
    moveLine: (stageId: string, lineId: string, dir: -1 | 1) =>
      update((d) => {
        const arr = d.lines[stageId];
        if (!arr) return d;
        const i = arr.findIndex((l) => l.id === lineId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return d;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return d;
      }),

    // Tag CRUD
    addTag: (name = "New tag", color: Tag["color"] = "slate") =>
      update((d) => {
        d.tags.push({ id: newId("t"), name, color });
        return d;
      }),
    renameTag: (id: string, name: string) =>
      update((d) => {
        const t = d.tags.find((t) => t.id === id);
        if (t) t.name = name;
        return d;
      }),
    setTagColor: (id: string, color: Tag["color"]) =>
      update((d) => {
        const t = d.tags.find((t) => t.id === id);
        if (t) t.color = color;
        return d;
      }),
    deleteTag: (id: string) =>
      update((d) => {
        d.tags = d.tags.filter((t) => t.id !== id);
        for (const sid of Object.keys(d.lines)) {
          d.lines[sid] = d.lines[sid].map((l) =>
            l.tagId === id ? { ...l, tagId: undefined } : l,
          );
        }
        return d;
      }),

    reset: () => setDoc(seedDoc),
    importDoc: (next: JourneyDoc) => setDoc(next),
  };
}