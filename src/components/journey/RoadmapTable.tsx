import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftRight,
  Flame,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { EditableText } from "./EditableText";
import { TagPicker } from "./TagPicker";
import { TAG_DOT, TAG_PILL } from "./tag-colors";
import { useJourney } from "@/lib/journey-store";
import { TAG_COLORS, type Line, type Tag, type TagColor } from "@/lib/journey-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const UNTAGGED = "__untagged__";

type Props = {
  showMoneyOnFire: boolean;
  onManageTags: () => void;
};

export function RoadmapTable({ showMoneyOnFire, onManageTags }: Props) {
  const j = useJourney();
  const { doc } = j;

  const [active, setActive] = useState<
    | { type: "stage"; id: string }
    | { type: "tag"; id: string }
    | { type: "line"; stageId: string; tagId: string | null; lineId: string }
    | null
  >(null);

  const hasUntagged = useMemo(() => {
    for (const sid of Object.keys(doc.lines))
      for (const l of doc.lines[sid]) if (l.tagIds.length === 0) return true;
    return false;
  }, [doc.lines]);

  const rowTags: (Tag | { id: typeof UNTAGGED; name: string; color: TagColor })[] =
    hasUntagged
      ? [...doc.tags, { id: UNTAGGED, name: "Untagged", color: "slate" as TagColor }]
      : doc.tags;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const linesForCell = (stageId: string, tagId: string) =>
    (doc.lines[stageId] ?? []).filter((l) =>
      tagId === UNTAGGED ? l.tagIds.length === 0 : l.tagIds.includes(tagId),
    );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("stage:")) setActive({ type: "stage", id: id.slice(6) });
    else if (id.startsWith("tag:")) setActive({ type: "tag", id: id.slice(4) });
    else if (id.startsWith("line:")) {
      const [, stageId, tagId, lineId] = id.split(":");
      setActive({ type: "line", stageId, tagId: tagId === UNTAGGED ? null : tagId, lineId });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const a = String(e.active.id);
    const o = e.over ? String(e.over.id) : null;
    setActive(null);
    if (!o || a === o) return;

    if (a.startsWith("stage:") && o.startsWith("stage:")) {
      const ids = doc.stages.map((s) => s.id);
      const oi = ids.indexOf(a.slice(6));
      const ni = ids.indexOf(o.slice(6));
      if (oi >= 0 && ni >= 0) j.reorderStages(arrayMove(ids, oi, ni));
      return;
    }
    if (a.startsWith("tag:") && o.startsWith("tag:")) {
      const aId = a.slice(4);
      const oId = o.slice(4);
      if (aId === UNTAGGED || oId === UNTAGGED) return;
      const ids = doc.tags.map((t) => t.id);
      const oi = ids.indexOf(aId);
      const ni = ids.indexOf(oId);
      if (oi >= 0 && ni >= 0) j.reorderTags(arrayMove(ids, oi, ni));
      return;
    }
    if (a.startsWith("line:") && o.startsWith("cell:")) {
      const [, fromStageId, fromTagRaw, lineId] = a.split(":");
      const [, toStageId, toTagRaw] = o.split(":");
      const fromTagId = fromTagRaw === UNTAGGED ? null : fromTagRaw;
      const toTagId = toTagRaw === UNTAGGED ? null : toTagRaw;
      if (fromStageId === toStageId && fromTagId === toTagId) return;
      j.moveLineToCell({
        fromStageId,
        lineId,
        toStageId,
        fromTagId,
        toTagId,
      });
    }
  };

  const activeLine = (() => {
    if (!active || active.type !== "line") return null;
    return (doc.lines[active.stageId] ?? []).find((l) => l.id === active.lineId) ?? null;
  })();
  const activeStage =
    active?.type === "stage" ? doc.stages.find((s) => s.id === active.id) : null;
  const activeTag =
    active?.type === "tag" ? doc.tags.find((t) => t.id === active.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="border-collapse min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-secondary/70 backdrop-blur border-b border-r border-border p-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground min-w-[180px]">
                Tag \ Stage
              </th>
              <SortableContext
                items={doc.stages.map((s) => `stage:${s.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {doc.stages.map((s, i) => (
                  <StageHeader
                    key={s.id}
                    stage={s}
                    index={i}
                    valueTags={doc.valueTags}
                    showMoneyOnFire={showMoneyOnFire}
                    onRename={(patch) => j.setStage(s.id, patch)}
                    onValueChange={(valueTagIds) => j.setStage(s.id, { valueTagIds })}
                    onToggleOnFire={() => j.toggleStageOnFire(s.id)}
                    onDelete={() => {
                      if (confirm(`Delete stage "${s.title}"?`)) j.deleteStage(s.id);
                    }}
                    onManageValueTags={onManageTags}
                  />
                ))}
              </SortableContext>
              <th className="sticky top-0 z-20 bg-card border-b border-border p-2 min-w-[60px]">
                <button
                  onClick={() => j.addStage()}
                  title="Add stage"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={rowTags.map((t) => `tag:${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {rowTags.map((t) => (
                <TagRow
                  key={t.id}
                  tag={t as Tag}
                  isUntagged={t.id === UNTAGGED}
                  stages={doc.stages}
                  tags={doc.tags}
                  linesForCell={(stageId) => linesForCell(stageId, t.id)}
                  showMoneyOnFire={showMoneyOnFire}
                  onRename={(name) => j.renameTag(t.id, name)}
                  onColor={(c) => j.setTagColor(t.id, c)}
                  onDelete={() => {
                    if (confirm(`Delete tag "${t.name}"? Lines keep their other tags.`))
                      j.deleteTag(t.id);
                  }}
                  onUpdateLine={(stageId, lineId, patch) =>
                    j.updateLine(stageId, lineId, patch)
                  }
                  onDeleteLine={(stageId, lineId) => j.deleteLine(stageId, lineId)}
                  onAddLine={(stageId) => {
                    j.addLine(stageId, true);
                    if (t.id !== UNTAGGED) {
                      // The new line is the last in stage; tag it with this row's tag.
                      const after = j.doc.lines[stageId] ?? [];
                      const last = after[after.length - 1];
                      if (last) j.updateLine(stageId, last.id, { tagIds: [t.id] });
                    }
                  }}
                  onManageTags={onManageTags}
                />
              ))}
            </SortableContext>
            <tr>
              <td className="sticky left-0 z-10 bg-secondary/40 border-r border-border p-2 min-w-[180px]">
                <button
                  onClick={() => j.addTag()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add tag
                </button>
              </td>
              <td colSpan={doc.stages.length + 1} className="bg-secondary/10" />
            </tr>
          </tbody>
        </table>
      </div>

      <DragOverlay>
        {activeLine ? (
          <div
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs shadow-lg max-w-[300px]",
              activeLine.exists
                ? "bg-background border-border text-foreground/90"
                : "bg-destructive/10 border-dashed border-destructive/50 text-foreground",
            )}
          >
            {activeLine.text || <span className="italic text-muted-foreground">Empty line</span>}
          </div>
        ) : activeStage ? (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold shadow-lg">
            {activeStage.emoji} {activeStage.title}
          </div>
        ) : activeTag ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-lg",
              TAG_PILL[activeTag.color as TagColor],
            )}
          >
            {activeTag.name}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---- Stage header (column) ----

function StageHeader({
  stage,
  index,
  valueTags,
  showMoneyOnFire,
  onRename,
  onValueChange,
  onToggleOnFire,
  onDelete,
  onManageValueTags,
}: {
  stage: import("@/lib/journey-data").Stage;
  index: number;
  valueTags: Tag[];
  showMoneyOnFire: boolean;
  onRename: (patch: Partial<import("@/lib/journey-data").Stage>) => void;
  onValueChange: (next: string[]) => void;
  onToggleOnFire: () => void;
  onDelete: () => void;
  onManageValueTags: () => void;
}) {
  const id = `stage:${stage.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const fire = showMoneyOnFire && !!stage.onFire;
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "group sticky top-0 z-10 bg-card border-b border-r border-border p-3 text-left align-top min-w-[280px] max-w-[320px]",
        fire && "bg-destructive/5",
        isDragging && "shadow-lg",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          title="Drag to reorder stage"
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Stage {String(index + 1).padStart(2, "0")}
          </div>
          <div className="mt-1 flex items-start gap-2">
            <EditableText
              value={stage.emoji}
              onChange={(emoji) => onRename({ emoji })}
              className="text-xl leading-none w-7 text-center"
            />
            <div className="min-w-0 flex-1">
              <EditableText
                value={stage.title}
                onChange={(title) => onRename({ title })}
                className="font-semibold text-sm leading-tight"
              />
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                <EditableText
                  multiline
                  value={stage.subtitle}
                  onChange={(subtitle) => onRename({ subtitle })}
                  placeholder="Add subtitle…"
                />
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <TagPicker
              tags={valueTags}
              values={stage.valueTagIds}
              onChange={onValueChange}
              onManage={onManageValueTags}
              placeholder="Value"
              manageLabel="Manage value tags…"
            />
            <button
              onClick={onToggleOnFire}
              title={stage.onFire ? "Unmark money on fire" : "Mark money on fire"}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition",
                stage.onFire
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary",
              )}
            >
              <Flame className="h-3 w-3" /> Fire
            </button>
          </div>
        </div>
        <button
          onClick={onDelete}
          title="Delete stage"
          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </th>
  );
}

// ---- Tag row ----

function TagRow({
  tag,
  isUntagged,
  stages,
  tags,
  linesForCell,
  showMoneyOnFire,
  onRename,
  onColor,
  onDelete,
  onUpdateLine,
  onDeleteLine,
  onAddLine,
  onManageTags,
}: {
  tag: Tag;
  isUntagged: boolean;
  stages: import("@/lib/journey-data").Stage[];
  tags: Tag[];
  linesForCell: (stageId: string) => Line[];
  showMoneyOnFire: boolean;
  onRename: (name: string) => void;
  onColor: (c: TagColor) => void;
  onDelete: () => void;
  onUpdateLine: (stageId: string, lineId: string, patch: Partial<Line>) => void;
  onDeleteLine: (stageId: string, lineId: string) => void;
  onAddLine: (stageId: string) => void;
  onManageTags: () => void;
}) {
  const id = `tag:${tag.id}`;
  const sortable = useSortable({ id, disabled: isUntagged });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={sortable.setNodeRef} style={style} className="align-top group/row">
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 bg-secondary/70 backdrop-blur border-b border-r border-border p-3 text-left min-w-[180px]",
          sortable.isDragging && "shadow-lg",
        )}
      >
        <div className="flex items-center gap-1.5">
          {!isUntagged && (
            <button
              {...sortable.attributes}
              {...sortable.listeners}
              title="Drag to reorder tag"
              className="p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {!isUntagged ? (
            <ColorSwatch color={tag.color as TagColor} onChange={onColor} />
          ) : (
            <span className={cn("h-3 w-3 rounded-full", TAG_DOT.slate)} />
          )}
          {isUntagged ? (
            <span className="text-xs font-medium italic text-muted-foreground">
              Untagged
            </span>
          ) : (
            <EditableText
              value={tag.name}
              onChange={onRename}
              className="text-xs font-semibold flex-1"
            />
          )}
          {!isUntagged && (
            <button
              onClick={onDelete}
              title="Delete tag"
              className="opacity-0 group-hover/row:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </th>
      {stages.map((s) => (
        <Cell
          key={s.id}
          stageId={s.id}
          tagId={tag.id}
          isUntagged={isUntagged}
          fire={showMoneyOnFire && !!s.onFire}
          lines={linesForCell(s.id)}
          tags={tags}
          onUpdateLine={(lineId, patch) => onUpdateLine(s.id, lineId, patch)}
          onDeleteLine={(lineId) => onDeleteLine(s.id, lineId)}
          onAddLine={() => onAddLine(s.id)}
          onManageTags={onManageTags}
        />
      ))}
      <td className="bg-secondary/5 border-b border-border" />
    </tr>
  );
}

// ---- Cell ----

function Cell({
  stageId,
  tagId,
  isUntagged,
  fire,
  lines,
  tags,
  onUpdateLine,
  onDeleteLine,
  onAddLine,
  onManageTags,
}: {
  stageId: string;
  tagId: string;
  isUntagged: boolean;
  fire: boolean;
  lines: Line[];
  tags: Tag[];
  onUpdateLine: (lineId: string, patch: Partial<Line>) => void;
  onDeleteLine: (lineId: string) => void;
  onAddLine: () => void;
  onManageTags: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${stageId}:${tagId}`,
  });

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "border-b border-r border-border p-2 align-top min-w-[280px] max-w-[320px] transition-colors",
        fire && "bg-destructive/[0.03]",
        isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40",
      )}
    >
      <ul className="space-y-1.5">
        {lines.map((l) => (
          <DraggableLine
            key={l.id}
            line={l}
            stageId={stageId}
            tagId={tagId}
            tags={tags}
            onUpdate={(patch) => onUpdateLine(l.id, patch)}
            onDelete={() => onDeleteLine(l.id)}
            onManageTags={onManageTags}
            isUntagged={isUntagged}
          />
        ))}
      </ul>
      <button
        onClick={onAddLine}
        className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </td>
  );
}

// ---- Line ----

function DraggableLine({
  line,
  stageId,
  tagId,
  tags,
  onUpdate,
  onDelete,
  onManageTags,
  isUntagged,
}: {
  line: Line;
  stageId: string;
  tagId: string;
  tags: Tag[];
  onUpdate: (patch: Partial<Line>) => void;
  onDelete: () => void;
  onManageTags: () => void;
  isUntagged: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `line:${stageId}:${tagId}:${line.id}`,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : { opacity: isDragging ? 0.3 : 1 };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/line relative rounded-md border px-2 py-1.5 text-xs leading-snug",
        line.exists
          ? "bg-background border-border text-foreground/90"
          : "bg-destructive/[0.05] border-dashed border-destructive/40 text-foreground/80",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          title="Drag line"
          className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="flex-1 min-w-0">
          <EditableText
            multiline
            value={line.text}
            onChange={(text) => onUpdate({ text })}
            placeholder="Add a note…"
          />
          {!isUntagged && (
            <div className="mt-1">
              <TagPicker
                tags={tags}
                values={line.tagIds}
                onChange={(tagIds) => onUpdate({ tagIds })}
                onManage={onManageTags}
              />
            </div>
          )}
        </div>
      </div>
      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover/line:opacity-100 transition">
        <button
          title={line.exists ? "Mark as gap" : "Mark as exists"}
          onClick={() => onUpdate({ exists: !line.exists })}
          className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <ArrowLeftRight className="h-3 w-3" />
        </button>
        <button
          title="Delete line"
          onClick={onDelete}
          className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

// ---- Color swatch (same UX as the Tags page) ----

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
            "h-3.5 w-3.5 rounded-full ring-2 ring-offset-1 ring-offset-background ring-border hover:ring-foreground/60 transition shrink-0",
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