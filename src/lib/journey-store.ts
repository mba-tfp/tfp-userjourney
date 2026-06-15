import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  seedDoc,
  newId,
  VALUE_TAG_IDS,
  type JourneyDoc,
  type Line,
  type Stage,
  type Tag,
} from "./journey-data";
import { loadJourney, saveJourney } from "./journey.functions";

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
  // Identify any legacy "exists today" / "doesn't exist today" tags and migrate
  // their membership onto the line.exists boolean (bucket), then strip the tags.
  const rawTags: any[] = Array.isArray(raw?.tags) ? raw.tags : seedDoc.tags;
  const normName = (n: unknown) =>
    String(n ?? "")
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  const EXISTS_NAMES = new Set(["what exists today", "exists today"]);
  const GAP_NAMES = new Set([
    "what doesn't exist today",
    "doesn't exist today",
    "what does not exist today",
    "does not exist today",
  ]);
  const existsTagIds = new Set(
    rawTags.filter((t) => EXISTS_NAMES.has(normName(t?.name))).map((t) => t.id),
  );
  const gapTagIds = new Set(
    rawTags.filter((t) => GAP_NAMES.has(normName(t?.name))).map((t) => t.id),
  );
  const isBucketTag = (id: string) => existsTagIds.has(id) || gapTagIds.has(id);

  const lines: Record<string, Line[]> = {};
  for (const [sid, arr] of Object.entries((raw?.lines ?? {}) as Record<string, any[]>)) {
    lines[sid] = (arr ?? []).map((l: any) => {
      const rawIds: string[] = Array.isArray(l.tagIds)
        ? l.tagIds.filter(Boolean)
        : typeof l.tagId === "string"
          ? [l.tagId]
          : [];
      let exists = !!l.exists;
      if (rawIds.some((id) => gapTagIds.has(id))) exists = false;
      else if (rawIds.some((id) => existsTagIds.has(id))) exists = true;
      return {
        id: l.id,
        text: l.text ?? "",
        exists,
        tagIds: rawIds.filter((id) => !isBucketTag(id)),
      };
    });
  }
  // Strip bucket tags from stage valueTagIds defensively, and from doc.tags.
  const cleanedStages = stages.map((s) => ({
    ...s,
    valueTagIds: s.valueTagIds.filter((id) => !isBucketTag(id)),
  }));
  const cleanedTags: Tag[] = rawTags
    .filter((t) => !isBucketTag(t.id))
    .map((t) => ({ id: t.id, name: t.name, color: t.color }));
  return {
    title: raw?.title ?? seedDoc.title,
    stages: cleanedStages,
    tags: cleanedTags,
    valueTags: raw?.valueTags ?? seedDoc.valueTags,
    lines,
  };
}

export function useJourney() {
  const [doc, setDoc] = useState<JourneyDoc>(seedDoc);
  const [hydrated, setHydrated] = useState(false);
  const load = useServerFn(loadJourney);
  const save = useServerFn(saveJourney);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo / redo history of doc snapshots.
  const past = useRef<JourneyDoc[]>([]);
  const future = useRef<JourneyDoc[]>([]);
  const skipHistory = useRef(false);
  const HISTORY_LIMIT = 100;
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = () => setHistoryTick((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { doc: stored } = await load();
        if (cancelled) return;
        skipHistory.current = true;
        if (stored) {
          setDoc(normalize(stored));
        } else {
          setDoc(seedDoc);
          // Seed the row so subsequent saves upsert cleanly.
          await save({ data: { doc: seedDoc } });
        }
      } catch (e) {
        console.error("Failed to load journey", e);
        if (!cancelled) {
          skipHistory.current = true;
          setDoc(seedDoc);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, save]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save({ data: { doc } }).catch((e) => console.error("Failed to save journey", e));
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, hydrated, save]);

  const update = useCallback((fn: (d: JourneyDoc) => JourneyDoc) => {
    setDoc((d) => {
      if (!skipHistory.current) {
        past.current.push(d);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        if (future.current.length) future.current = [];
        bumpHistory();
      }
      skipHistory.current = false;
      return fn(structuredClone(d));
    });
  }, []);

  const undo = useCallback(() => {
    setDoc((d) => {
      const prev = past.current.pop();
      if (!prev) return d;
      future.current.push(d);
      skipHistory.current = true;
      bumpHistory();
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((d) => {
      const next = future.current.pop();
      if (!next) return d;
      past.current.push(d);
      skipHistory.current = true;
      bumpHistory();
      return next;
    });
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl+Z = undo, Shift+Cmd/Ctrl+Z or Ctrl+Y = redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
    reorderStages: (nextOrder: string[]) =>
      update((d) => {
        const byId = new Map(d.stages.map((s) => [s.id, s]));
        const seen = new Set<string>();
        const ordered: Stage[] = [];
        for (const id of nextOrder) {
          const s = byId.get(id);
          if (s && !seen.has(id)) {
            ordered.push(s);
            seen.add(id);
          }
        }
        for (const s of d.stages) if (!seen.has(s.id)) ordered.push(s);
        d.stages = ordered;
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
    addLineInCell: (stageId: string, tagId: string | null) =>
      update((d) => {
        d.lines[stageId] = d.lines[stageId] ?? [];
        d.lines[stageId].push({
          id: newId("ln"),
          text: "",
          exists: true,
          tagIds: tagId ? [tagId] : [],
        });
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
    // Move a line across cells in the roadmap. If `fromTagId` and `toTagId`
    // differ, the tag is swapped (other tags on the line are preserved).
    // `toIndex` inserts at that position in the destination stage; omitted = end.
    moveLineToCell: (args: {
      fromStageId: string;
      lineId: string;
      toStageId: string;
      fromTagId?: string | null;
      toTagId?: string | null;
      toIndex?: number;
    }) =>
      update((d) => {
        const { fromStageId, lineId, toStageId, fromTagId, toTagId, toIndex } = args;
        const src = d.lines[fromStageId];
        if (!src) return d;
        const idx = src.findIndex((l) => l.id === lineId);
        if (idx < 0) return d;
        const [line] = src.splice(idx, 1);
        if (fromTagId && toTagId && fromTagId !== toTagId) {
          const next = line.tagIds.filter((id) => id !== fromTagId);
          if (!next.includes(toTagId)) next.push(toTagId);
          line.tagIds = next;
        } else if (!fromTagId && toTagId && !line.tagIds.includes(toTagId)) {
          line.tagIds = [...line.tagIds, toTagId];
        }
        d.lines[toStageId] = d.lines[toStageId] ?? [];
        const dst = d.lines[toStageId];
        const insertAt =
          toIndex === undefined || toIndex < 0 || toIndex > dst.length
            ? dst.length
            : toIndex;
        dst.splice(insertAt, 0, line);
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

    reset: () =>
      setDoc((d) => {
        past.current.push(d);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        bumpHistory();
        return seedDoc;
      }),
    importDoc: (next: JourneyDoc) =>
      setDoc((d) => {
        past.current.push(d);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        bumpHistory();
        return next;
      }),

    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    // expose tick to satisfy lint usage and force consumers to re-render on history change
    _historyTick: historyTick,
  };
}