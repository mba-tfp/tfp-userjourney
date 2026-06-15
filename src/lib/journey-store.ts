import { useEffect, useState, useCallback } from "react";
import {
  seedDoc,
  newId,
  VALUE_TAG_IDS,
  type JourneyDoc,
  type Line,
  type Stage,
  type Tag,
} from "./journey-data";

const KEY = "otto-journey-doc-v4";
const KEY_V3 = "otto-journey-doc-v3";
const KEY_V2 = "otto-journey-doc-v2";
const LEGACY_KEY = "otto-journey-doc-v1";

// v2 docs stored stage.value as "capacity" | "revenue" | "cost" and had no valueTags/onFire
// Normalize any prior shape (v2 single value string, v3 single tagId/valueTagId)
// into the current multi-tag shape.
function normalize(raw: any): JourneyDoc {
  const stages: Stage[] = (raw?.stages ?? []).map((s: any, i: number) => {
    let valueTagIds: string[] = [];
    if (Array.isArray(s?.valueTagIds)) valueTagIds = s.valueTagIds.filter(Boolean);
    else if (typeof s?.valueTagId === "string") valueTagIds = [s.valueTagId];
    else if (typeof s?.value === "string" && (VALUE_TAG_IDS as any)[s.value]) {
      valueTagIds = [(VALUE_TAG_IDS as any)[s.value]];
    }
    return {
      id: s.id,
      emoji: s.emoji,
      title: s.title,
      subtitle: s.subtitle,
      valueTagIds,
      onFire: typeof s.onFire === "boolean" ? s.onFire : seedDoc.stages[i]?.onFire ?? false,
    };
  });
  const lines: Record<string, Line[]> = {};
  for (const [sid, arr] of Object.entries((raw?.lines ?? {}) as Record<string, any[]>)) {
    lines[sid] = (arr ?? []).map((l: any) => ({
      id: l.id,
      text: l.text ?? "",
      exists: !!l.exists,
      tagIds: Array.isArray(l.tagIds)
        ? l.tagIds.filter(Boolean)
        : typeof l.tagId === "string"
          ? [l.tagId]
          : [],
    }));
  }
  return {
    title: raw?.title ?? seedDoc.title,
    stages,
    tags: raw?.tags ?? seedDoc.tags,
    valueTags: raw?.valueTags ?? seedDoc.valueTags,
    lines,
  };
}

function load(): JourneyDoc {
  if (typeof window === "undefined") return seedDoc;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
    // One-shot migrate from any previous version
    const prior = localStorage.getItem(KEY_V3) ?? localStorage.getItem(KEY_V2);
    if (prior) {
      const migrated = normalize(JSON.parse(prior));
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY);
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
        if (i >= 0) {
          const next = { ...d.stages[i], ...patch };
          if (Array.isArray(next.valueTagIds)) {
            next.valueTagIds = Array.from(new Set(next.valueTagIds));
          }
          d.stages[i] = next;
        }
        return d;
      }),
    addStage: (afterIndex?: number) =>
      update((d) => {
        const stage: Stage = {
          id: newId("s"),
          emoji: "✨",
          title: "New Stage",
          subtitle: "Describe this stage",
          valueTagIds: [],
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
    toggleStageOnFire: (id: string) =>
      update((d) => {
        const s = d.stages.find((s) => s.id === id);
        if (s) s.onFire = !s.onFire;
        return d;
      }),

    // Line CRUD
    addLine: (stageId: string, exists: boolean) =>
      update((d) => {
        d.lines[stageId] = d.lines[stageId] ?? [];
        d.lines[stageId].push({ id: newId("ln"), text: "", exists, tagIds: [] });
        return d;
      }),
    updateLine: (stageId: string, lineId: string, patch: Partial<Line>) =>
      update((d) => {
        const arr = d.lines[stageId];
        if (!arr) return d;
        const i = arr.findIndex((l) => l.id === lineId);
        if (i >= 0) {
          const next = { ...arr[i], ...patch };
          if (Array.isArray(next.tagIds)) {
            next.tagIds = Array.from(new Set(next.tagIds));
          }
          arr[i] = next;
        }
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
          d.lines[sid] = d.lines[sid].map((l) => ({
            ...l,
            tagIds: l.tagIds.filter((t) => t !== id),
          }));
        }
        return d;
      }),
    reorderTags: (nextOrder: string[]) =>
      update((d) => {
        const byId = new Map(d.tags.map((t) => [t.id, t]));
        const seen = new Set<string>();
        const ordered: Tag[] = [];
        for (const id of nextOrder) {
          const t = byId.get(id);
          if (t && !seen.has(id)) {
            ordered.push(t);
            seen.add(id);
          }
        }
        // Append any tags missing from nextOrder, preserving prior order.
        for (const t of d.tags) if (!seen.has(t.id)) ordered.push(t);
        d.tags = ordered;
        return d;
      }),
    mergeTag: (sourceId: string, targetId: string) =>
      update((d) => {
        if (sourceId === targetId) return d;
        if (!d.tags.find((t) => t.id === targetId)) return d;
        for (const sid of Object.keys(d.lines)) {
          d.lines[sid] = d.lines[sid].map((l) => {
            if (!l.tagIds.includes(sourceId)) return l;
            const rewritten = l.tagIds.map((id) => (id === sourceId ? targetId : id));
            return { ...l, tagIds: Array.from(new Set(rewritten)) };
          });
        }
        d.tags = d.tags.filter((t) => t.id !== sourceId);
        return d;
      }),

    // Value tag CRUD (editable Capacity / Revenue / Cost registry)
    addValueTag: (name = "New value", color: Tag["color"] = "slate") =>
      update((d) => {
        d.valueTags.push({ id: newId("vt"), name, color });
        return d;
      }),
    renameValueTag: (id: string, name: string) =>
      update((d) => {
        const t = d.valueTags.find((t) => t.id === id);
        if (t) t.name = name;
        return d;
      }),
    setValueTagColor: (id: string, color: Tag["color"]) =>
      update((d) => {
        const t = d.valueTags.find((t) => t.id === id);
        if (t) t.color = color;
        return d;
      }),
    deleteValueTag: (id: string) =>
      update((d) => {
        d.valueTags = d.valueTags.filter((t) => t.id !== id);
        for (const s of d.stages) {
          s.valueTagIds = s.valueTagIds.filter((t) => t !== id);
        }
        return d;
      }),
    reorderValueTags: (nextOrder: string[]) =>
      update((d) => {
        const byId = new Map(d.valueTags.map((t) => [t.id, t]));
        const seen = new Set<string>();
        const ordered: Tag[] = [];
        for (const id of nextOrder) {
          const t = byId.get(id);
          if (t && !seen.has(id)) {
            ordered.push(t);
            seen.add(id);
          }
        }
        for (const t of d.valueTags) if (!seen.has(t.id)) ordered.push(t);
        d.valueTags = ordered;
        return d;
      }),
    mergeValueTag: (sourceId: string, targetId: string) =>
      update((d) => {
        if (sourceId === targetId) return d;
        if (!d.valueTags.find((t) => t.id === targetId)) return d;
        for (const s of d.stages) {
          if (!s.valueTagIds.includes(sourceId)) continue;
          const rewritten = s.valueTagIds.map((id) => (id === sourceId ? targetId : id));
          s.valueTagIds = Array.from(new Set(rewritten));
        }
        d.valueTags = d.valueTags.filter((t) => t.id !== sourceId);
        return d;
      }),

    reset: () => setDoc(seedDoc),
    importDoc: (next: JourneyDoc) => setDoc(next),
  };
}