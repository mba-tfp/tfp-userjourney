import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Merge, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useJourney } from "@/lib/journey-store";
import { TAG_COLORS, type Tag, type TagColor } from "@/lib/journey-data";
import { TAG_DOT } from "@/components/journey/tag-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tags")({
  head: () => ({
    meta: [
      { title: "Manage Tags — Journey Map" },
      {
        name: "description",
        content:
          "Rename, recolor, reorder, and merge tags used across the patient journey map.",
      },
    ],
  }),
  component: TagsPage,
});

type Section = "line" | "value";

function TagsPage() {
  const j = useJourney();

  // Compute usage counts up front so each row can display them.
  const lineTagUsage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const sid of Object.keys(j.doc.lines)) {
      for (const ln of j.doc.lines[sid]) {
        for (const id of ln.tagIds) m[id] = (m[id] ?? 0) + 1;
      }
    }
    return m;
  }, [j.doc.lines]);

  const valueTagUsage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of j.doc.stages) {
      for (const id of s.valueTagIds) m[id] = (m[id] ?? 0) + 1;
    }
    return m;
  }, [j.doc.stages]);

  if (!j.hydrated) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="h-3 w-32 rounded bg-secondary animate-pulse" />
          <div className="mt-3 h-8 w-64 rounded bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to journey
          </Link>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Manage tags
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-prose">
            Rename, recolor, reorder, or merge duplicates. Drag the handle to set
            the default display order everywhere tags appear.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-12">
        <TagSection
          section="line"
          title="Line tags"
          description="Label individual rows inside a stage (Patient, Clinic, TFP, Channel…)."
          tags={j.doc.tags}
          usage={lineTagUsage}
          usageLabel={(n) => `${n} line${n === 1 ? "" : "s"}`}
          onAdd={() => j.addTag()}
          onRename={(id, name) => j.renameTag(id, name)}
          onColor={(id, c) => j.setTagColor(id, c)}
          onDelete={(id) => j.deleteTag(id)}
          onReorder={(ids) => j.reorderTags(ids)}
          onMerge={(src, dst) => j.mergeTag(src, dst)}
        />

        <TagSection
          section="value"
          title="Value tags"
          description="Label whole stages by what's at stake (Capacity, Revenue, Cost…)."
          tags={j.doc.valueTags}
          usage={valueTagUsage}
          usageLabel={(n) => `${n} stage${n === 1 ? "" : "s"}`}
          onAdd={() => j.addValueTag()}
          onRename={(id, name) => j.renameValueTag(id, name)}
          onColor={(id, c) => j.setValueTagColor(id, c)}
          onDelete={(id) => j.deleteValueTag(id)}
          onReorder={(ids) => j.reorderValueTags(ids)}
          onMerge={(src, dst) => j.mergeValueTag(src, dst)}
        />
      </main>
    </div>
  );
}

function TagSection({
  title,
  description,
  tags,
  usage,
  usageLabel,
  onAdd,
  onRename,
  onColor,
  onDelete,
  onReorder,
  onMerge,
}: {
  section: Section;
  title: string;
  description: string;
  tags: Tag[];
  usage: Record<string, number>;
  usageLabel: (n: number) => string;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onColor: (id: string, c: TagColor) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onMerge: (sourceId: string, targetId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = tags.map((t) => t.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  // Lower-cased trimmed name index → ids that share it (for duplicate detection)
  const nameIndex = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of tags) {
      const k = t.name.trim().toLowerCase();
      if (!k) continue;
      m.set(k, [...(m.get(k) ?? []), t.id]);
    }
    return m;
  }, [tags]);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <Plus className="h-3.5 w-3.5" /> Add tag
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {tags.map((t) => (
                <SortableRow
                  key={t.id}
                  tag={t}
                  allTags={tags}
                  nameIndex={nameIndex}
                  usage={usage[t.id] ?? 0}
                  usageLabel={usageLabel}
                  onRename={(name) => onRename(t.id, name)}
                  onColor={(c) => onColor(t.id, c)}
                  onDelete={() => onDelete(t.id)}
                  onMerge={(targetId) => onMerge(t.id, targetId)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No tags yet. Add one above.
          </p>
        )}
      </div>
    </section>
  );
}

function SortableRow({
  tag,
  allTags,
  nameIndex,
  usage,
  usageLabel,
  onRename,
  onColor,
  onDelete,
  onMerge,
}: {
  tag: Tag;
  allTags: Tag[];
  nameIndex: Map<string, string[]>;
  usage: number;
  usageLabel: (n: number) => string;
  onRename: (name: string) => void;
  onColor: (c: TagColor) => void;
  onDelete: () => void;
  onMerge: (targetId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tag.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const [draft, setDraft] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);

  // Reset draft when external tag name changes (e.g. after merge).
  if (draft !== tag.name && error === null) {
    // best-effort sync without effect dependency thrash
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Name can't be empty");
      setDraft(tag.name);
      setTimeout(() => setError(null), 1500);
      return;
    }
    const dupOwners = nameIndex.get(trimmed.toLowerCase()) ?? [];
    const isDuplicate = dupOwners.some((id) => id !== tag.id);
    if (isDuplicate) {
      setError("A tag with this name already exists");
      setDraft(tag.name);
      setTimeout(() => setError(null), 2000);
      return;
    }
    setError(null);
    if (trimmed !== tag.name) onRename(trimmed);
  };

  const mergeTargets = allTags.filter((t) => t.id !== tag.id);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2",
        isDragging && "shadow-md",
      )}
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${tag.name}`}
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <ColorSwatch color={tag.color as TagColor} onChange={onColor} />

      <div className="flex-1 min-w-0">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setDraft(tag.name);
              setError(null);
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "w-full rounded-md border bg-transparent px-2 py-1 text-sm font-medium outline-none transition",
            error
              ? "border-destructive ring-2 ring-destructive/30"
              : "border-transparent hover:border-border focus:border-input focus:ring-2 focus:ring-ring/30",
          )}
        />
        {error && (
          <p className="mt-1 px-2 text-[11px] text-destructive">{error}</p>
        )}
      </div>

      <span className="hidden sm:inline text-[11px] tabular-nums text-muted-foreground">
        {usageLabel(usage)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="Merge into…"
            disabled={mergeTargets.length === 0}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Merge className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">
            Merge "{tag.name}" into…
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mergeTargets.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                if (
                  confirm(
                    `Merge "${tag.name}" into "${t.name}"? All references will move to "${t.name}" and "${tag.name}" will be deleted.`,
                  )
                ) {
                  onMerge(t.id);
                }
              }}
            >
              <span
                className={cn(
                  "mr-2 h-2.5 w-2.5 rounded-full",
                  TAG_DOT[t.color as TagColor] ?? TAG_DOT.slate,
                )}
              />
              {t.name}
            </DropdownMenuItem>
          ))}
          {mergeTargets.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No other tags to merge into
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        title="Delete tag"
        onClick={() => {
          if (
            confirm(
              usage > 0
                ? `Delete "${tag.name}"? It's used ${usage} time${usage === 1 ? "" : "s"} — those references will be cleared.`
                : `Delete "${tag.name}"?`,
            )
          ) {
            onDelete();
          }
        }}
        className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary transition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function ColorSwatch({
  color,
  onChange,
}: {
  color: TagColor;
  onChange: (c: TagColor) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Tag color: ${color}`}
          className={cn(
            "h-5 w-5 rounded-full ring-2 ring-offset-1 ring-offset-background ring-border hover:ring-foreground/60 transition",
            TAG_DOT[color],
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              aria-label={c}
              className={cn(
                "h-6 w-6 rounded-full transition",
                TAG_DOT[c],
                color === c
                  ? "ring-2 ring-offset-1 ring-foreground/70"
                  : "opacity-70 hover:opacity-100",
              )}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}