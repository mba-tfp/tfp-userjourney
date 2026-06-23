import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  seedDoc,
  newId,
  VALUE_TAG_IDS,
  BLOOMIC_LINE_TEXTS,
  BLOOMIC_TAG_NAME,
  FIRE_GAP_LINES,
  ADDITIONAL_LENS_LINES,
  type JourneyDoc,
  type Line,
  type Stage,
  type Tag,
} from "./journey-data";
import { loadJourney, saveJourney } from "./journey.functions";

// One-time migration: append any seed gap lines (exists: false) that are missing
// from a stored doc, matched by exact text within the same stage. Idempotent.
function mergeSeedGaps(doc: JourneyDoc): { doc: JourneyDoc; changed: boolean } {
  let changed = false;
  const next: JourneyDoc = { ...doc, lines: { ...doc.lines } };
  for (const stage of seedDoc.stages) {
    const seedLines = seedDoc.lines[stage.id] ?? [];
    const existing = next.lines[stage.id] ?? [];
    const existingTexts = new Set(existing.map((l) => l.text.trim()));
    const toAppend: Line[] = [];
    for (const sl of seedLines) {
      if (sl.exists) continue;
      if (existingTexts.has(sl.text.trim())) continue;
      toAppend.push({
        id: newId("ln"),
        text: sl.text,
        tagIds: [...sl.tagIds],
        exists: false,
        valueTagIds: sl.valueTagIds ? [...sl.valueTagIds] : [],
        onFire: !!sl.onFire,
      });
    }
    if (toAppend.length) {
      next.lines[stage.id] = [...existing, ...toAppend];
      changed = true;
    }
  }

  // Ensure the Bloomic tag exists in the stored tag palette.
  let bloomic = next.tags.find((t) => t.name === BLOOMIC_TAG_NAME);
  if (!bloomic) {
    bloomic = { id: newId("t"), name: BLOOMIC_TAG_NAME, color: "violet" };
    next.tags = [...next.tags, bloomic];
    changed = true;
  }
  const bloomicId = bloomic.id;

  // Apply Bloomic tag to any gap line whose text matches the Bloomic target set.
  for (const stage of seedDoc.stages) {
    const arr = next.lines[stage.id];
    if (!arr) continue;
    let stageChanged = false;
    const updated = arr.map((l) => {
      if (l.exists) return l;
      if (!BLOOMIC_LINE_TEXTS.has(l.text.trim())) return l;
      if (l.tagIds.includes(bloomicId)) return l;
      stageChanged = true;
      return { ...l, tagIds: [...l.tagIds, bloomicId] };
    });
    if (stageChanged) {
      next.lines[stage.id] = updated;
      changed = true;
    }
  }

  // Prepend top-of-stage TFP impact statements for the "money on fire" stages,
  // if not already present (matched by exact text).
  const tfpTag = next.tags.find((t) => t.name === "TFP");
  if (tfpTag) {
    for (const fg of FIRE_GAP_LINES) {
      const stage = seedDoc.stages[fg.stageIndex];
      if (!stage) continue;
      const arr = next.lines[stage.id] ?? [];
      if (arr.some((l) => l.text.trim() === fg.text.trim())) continue;
      next.lines[stage.id] = [
        {
          id: newId("ln"),
          text: fg.text,
          tagIds: [tfpTag.id],
          exists: false,
          onFire: true,
          valueTagIds: [],
        },
        ...arr,
      ];
      changed = true;
    }
  }

  // Append additional lens-row commentary lines (exists: true) that are
  // missing from a stored doc, matched by exact text within the same stage.
  const tagIdByName = new Map(next.tags.map((t) => [t.name, t.id]));
  for (const al of ADDITIONAL_LENS_LINES) {
    const stage = seedDoc.stages[al.stageIndex];
    if (!stage) continue;
    const arr = next.lines[stage.id] ?? [];
    if (arr.some((l) => l.text.trim() === al.text.trim())) continue;
    const tagId = tagIdByName.get(al.tagName);
    next.lines[stage.id] = [
      ...arr,
      {
        id: newId("ln"),
        text: al.text,
        tagIds: tagId ? [tagId] : [],
        exists: true,
        valueTagIds: [],
      },
    ];
    changed = true;
  }

  return { doc: next, changed };
}

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
      // Stage-level value tags are migrated onto each line below; keep the
      // field on the stage for back-compat but clear it so the UI no longer
      // reads it.
      valueTagIds: [],
      // Stage-level onFire is migrated onto gap lines below.
      _migrateValueTagIds: valueTagIds,
      _migrateOnFire:
        typeof s.onFire === "boolean" ? s.onFire : seedDoc.stages[i]?.onFire ?? false,
      onFire: typeof s.onFire === "boolean" ? s.onFire : seedDoc.stages[i]?.onFire ?? false,
    } as Stage & { _migrateValueTagIds: string[]; _migrateOnFire: boolean };
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
  const stageMigrateById = new Map(
    (stages as any[]).map((s) => [
      s.id,
      {
        onFire: !!s._migrateOnFire,
        valueTagIds: (s._migrateValueTagIds as string[]) ?? [],
      },
    ]),
  );
  const clampScore = (n: unknown, fallback: number) => {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
    return Math.max(1, Math.min(5, v));
  };
  for (const [sid, arr] of Object.entries((raw?.lines ?? {}) as Record<string, any[]>)) {
    const migrate = stageMigrateById.get(sid) ?? { onFire: false, valueTagIds: [] };
    const stageOnFire = migrate.onFire;
    lines[sid] = (arr ?? []).map((l: any) => {
      const rawIds: string[] = Array.isArray(l.tagIds)
        ? l.tagIds.filter(Boolean)
        : typeof l.tagId === "string"
          ? [l.tagId]
          : [];
      let exists = !!l.exists;
      if (rawIds.some((id) => gapTagIds.has(id))) exists = false;
      else if (rawIds.some((id) => existsTagIds.has(id))) exists = true;
      // Seed scores from signals when missing.
      const seedUrgency = !exists ? (stageOnFire ? 4 : 3) : 2;
      const seedImpact = stageOnFire ? 4 : 3;
      // Per-line valueTagIds: prefer stored values, otherwise migrate from
      // the stage. Per-line onFire: prefer stored value, otherwise inherit
      // the stage flag for gap lines only.
      const storedLineValueTagIds: string[] = Array.isArray(l.valueTagIds)
        ? l.valueTagIds.filter(Boolean)
        : [];
      const valueTagIds =
        storedLineValueTagIds.length > 0
          ? Array.from(new Set(storedLineValueTagIds))
          : Array.from(new Set(migrate.valueTagIds));
      const lineOnFire =
        typeof l.onFire === "boolean" ? l.onFire : !exists && stageOnFire;
      return {
        id: l.id,
        text: l.text ?? "",
        exists,
        tagIds: rawIds.filter((id) => !isBucketTag(id)),
        valueTagIds,
        onFire: lineOnFire,
        impact: clampScore(l.impact, seedImpact),
        urgency: clampScore(l.urgency, seedUrgency),
        effort: clampScore(l.effort, 3),
      };
    });
  }
  // Strip bucket tags from doc.tags.
  const cleanedStages = stages.map((s) => ({
    id: s.id,
    emoji: s.emoji,
    title: s.title,
    subtitle: s.subtitle,
    valueTagIds: [] as string[],
  })) as Stage[];
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
  const HISTORY_LIMIT = 100;
  const [pastLen, setPastLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);
  const docRef = useRef<JourneyDoc>(seedDoc);

  const commitDoc = useCallback((next: JourneyDoc) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { doc: stored } = await load();
        if (cancelled) return;
        if (stored) {
          const normalized = normalize(stored);
          const { doc: merged, changed } = mergeSeedGaps(normalized);
          commitDoc(merged);
          if (changed) {
            save({ data: { doc: merged } }).catch((e) =>
              console.error("Failed to persist seed-gap merge", e),
            );
          }
        } else {
          commitDoc(seedDoc);
          // Seed the row so subsequent saves upsert cleanly.
          await save({ data: { doc: seedDoc } });
        }
      } catch (e) {
        console.error("Failed to load journey", e);
        if (!cancelled) {
          commitDoc(seedDoc);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, save, commitDoc]);

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
    const prev = docRef.current;
    past.current.push(prev);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    const next = fn(structuredClone(prev));
    commitDoc(next);
    setPastLen(past.current.length);
    setFutureLen(0);
  }, [commitDoc]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(docRef.current);
    commitDoc(prev);
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
  }, [commitDoc]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(docRef.current);
    commitDoc(next);
    setPastLen(past.current.length);
    setFutureLen(future.current.length);
  }, [commitDoc]);

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
    toggleLineOnFire: (stageId: string, lineId: string) =>
      update((d) => {
        const arr = d.lines[stageId];
        if (!arr) return d;
        const i = arr.findIndex((l) => l.id === lineId);
        if (i >= 0) arr[i] = { ...arr[i], onFire: !arr[i].onFire };
        return d;
      }),

    // Line CRUD
    addLine: (stageId: string, exists: boolean) =>
      update((d) => {
        d.lines[stageId] = d.lines[stageId] ?? [];
        d.lines[stageId].push({
          id: newId("ln"),
          text: "",
          exists,
          tagIds: [],
          valueTagIds: [],
        });
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
          valueTagIds: [],
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
          if (Array.isArray(next.valueTagIds)) {
            next.valueTagIds = Array.from(new Set(next.valueTagIds));
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
    setLineScores: (
      stageId: string,
      lineId: string,
      patch: { impact?: number; urgency?: number; effort?: number },
    ) =>
      update((d) => {
        const arr = d.lines[stageId];
        if (!arr) return d;
        const i = arr.findIndex((l) => l.id === lineId);
        if (i < 0) return d;
        const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
        const cur = arr[i];
        arr[i] = {
          ...cur,
          impact: typeof patch.impact === "number" ? clamp(patch.impact) : cur.impact,
          urgency: typeof patch.urgency === "number" ? clamp(patch.urgency) : cur.urgency,
          effort: typeof patch.effort === "number" ? clamp(patch.effort) : cur.effort,
        };
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
      exists?: boolean;
    }) =>
      update((d) => {
        const { fromStageId, lineId, toStageId, fromTagId, toTagId, toIndex, exists } =
          args;
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
        if (typeof exists === "boolean") line.exists = exists;
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
      (() => {
        past.current.push(docRef.current);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        commitDoc(seedDoc);
        setPastLen(past.current.length);
        setFutureLen(0);
      })(),
    importDoc: (next: JourneyDoc) =>
      (() => {
        past.current.push(docRef.current);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        commitDoc(next);
        setPastLen(past.current.length);
        setFutureLen(0);
      })(),

    undo,
    redo,
    canUndo: pastLen > 0,
    canRedo: futureLen > 0,
  };
}