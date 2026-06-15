import { useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flame, GripVertical, Plus, Trash2, X } from "lucide-react";
import { EditableText } from "./EditableText";
import { TagPicker } from "./TagPicker";
import { useJourney } from "@/lib/journey-store";
import { type Line, type Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  showMoneyOnFire: boolean;
  onManageTags: () => void;
};

type Bucket = "exists" | "gap";
const BUCKETS: { key: Bucket; label: string; sub: string }[] = [
  { key: "exists", label: "What Exists Today", sub: "Live, in production" },
  { key: "gap", label: "What Doesn't Exist Today", sub: "Gaps & opportunities" },
];

export function RoadmapTable({ showMoneyOnFire, onManageTags }: Props) {
  const j = useJourney();
  const { doc } = j;

  const [active, setActive] = useState<
    | { type: "stage"; id: string }
    | {
        type: "line";
        stageId: string;
        bucket: Bucket;
        lineId: string;
      }
    | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const linesForCell = (stageId: string, bucket: Bucket): Line[] =>
    (doc.lines[stageId] ?? []).filter((l) =>
      bucket === "exists" ? l.exists : !l.exists,
    );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("stage:")) setActive({ type: "stage", id: id.slice(6) });
    else if (id.startsWith("line:")) {
      const [, stageId, bucket, lineId] = id.split(":");
      setActive({ type: "line", stageId, bucket: bucket as Bucket, lineId });
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
    if (a.startsWith("line:") && o.startsWith("cell:")) {
      const [, fromStageId, fromBucket, lineId] = a.split(":");
      const [, toStageId, toBucket] = o.split(":");
      if (fromStageId === toStageId && fromBucket === toBucket) return;
      j.moveLineToCell({
        fromStageId,
        lineId,
        toStageId,
        exists: toBucket === "exists",
      });
    }
  };

  const activeLine = (() => {
    if (!active || active.type !== "line") return null;
    return (doc.lines[active.stageId] ?? []).find((l) => l.id === active.lineId) ?? null;
  })();
  const activeStage =
    active?.type === "stage" ? doc.stages.find((s) => s.id === active.id) : null;

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
                Status \ Stage
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
            {BUCKETS.map((b) => (
              <BucketRow
                key={b.key}
                bucket={b.key}
                label={b.label}
                sub={b.sub}
                stages={doc.stages}
                tags={doc.tags}
                linesForCell={(stageId) => linesForCell(stageId, b.key)}
                showMoneyOnFire={showMoneyOnFire}
                onUpdateLine={(stageId, lineId, patch) =>
                  j.updateLine(stageId, lineId, patch)
                }
                onDeleteLine={(stageId, lineId) => j.deleteLine(stageId, lineId)}
                onAddLine={(stageId) => j.addLine(stageId, b.key === "exists")}
                onManageTags={onManageTags}
              />
            ))}
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

// ---- Bucket row (Exists / Gap) ----

function BucketRow({
  bucket,
  label,
  sub,
  stages,
  tags,
  linesForCell,
  showMoneyOnFire,
  onUpdateLine,
  onDeleteLine,
  onAddLine,
  onManageTags,
}: {
  bucket: Bucket;
  label: string;
  sub: string;
  stages: import("@/lib/journey-data").Stage[];
  tags: Tag[];
  linesForCell: (stageId: string) => Line[];
  showMoneyOnFire: boolean;
  onUpdateLine: (stageId: string, lineId: string, patch: Partial<Line>) => void;
  onDeleteLine: (stageId: string, lineId: string) => void;
  onAddLine: (stageId: string) => void;
  onManageTags: () => void;
}) {
  const isGap = bucket === "gap";
  return (
    <tr className="align-top">
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 backdrop-blur border-b border-r border-border p-3 text-left min-w-[180px]",
          isGap ? "bg-destructive/[0.06]" : "bg-secondary/70",
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isGap ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {isGap ? "Gap" : "Exists"}
          </span>
          <span className="text-sm font-semibold leading-tight">{label}</span>
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        </div>
      </th>
      {stages.map((s) => (
        <Cell
          key={s.id}
          stageId={s.id}
          bucket={bucket}
          fire={showMoneyOnFire && !!s.onFire}
          lines={linesForCell(s.id)}
          tags={tags}
          onUpdateLine={(lineId, patch) => onUpdateLine(s.id, lineId, patch)}
          onDeleteLine={(lineId) => onDeleteLine(s.id, lineId)}
          onAddLine={() => onAddLine(s.id)}
          onManageTags={onManageTags}
        />
      ))}
      <td
        className={cn(
          "border-b border-border",
          isGap ? "bg-destructive/[0.02]" : "bg-secondary/5",
        )}
      />
    </tr>
  );
}

// ---- Cell ----

function Cell({
  stageId,
  bucket,
  fire,
  lines,
  tags,
  onUpdateLine,
  onDeleteLine,
  onAddLine,
  onManageTags,
}: {
  stageId: string;
  bucket: Bucket;
  fire: boolean;
  lines: Line[];
  tags: Tag[];
  onUpdateLine: (lineId: string, patch: Partial<Line>) => void;
  onDeleteLine: (lineId: string) => void;
  onAddLine: () => void;
  onManageTags: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${stageId}:${bucket}`,
  });
  const isGap = bucket === "gap";

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "border-b border-r border-border p-2 align-top min-w-[280px] max-w-[320px] transition-colors",
        isGap && "bg-destructive/[0.02]",
        fire && "bg-destructive/[0.05]",
        isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40",
      )}
    >
      <ul className="space-y-1.5">
        {lines.map((l) => (
          <DraggableLine
            key={l.id}
            line={l}
            stageId={stageId}
            bucket={bucket}
            tags={tags}
            onUpdate={(patch) => onUpdateLine(l.id, patch)}
            onDelete={() => onDeleteLine(l.id)}
            onManageTags={onManageTags}
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
  bucket,
  tags,
  onUpdate,
  onDelete,
  onManageTags,
}: {
  line: Line;
  stageId: string;
  bucket: Bucket;
  tags: Tag[];
  onUpdate: (patch: Partial<Line>) => void;
  onDelete: () => void;
  onManageTags: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `line:${stageId}:${bucket}:${line.id}`,
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
          <div className="mt-1">
            <TagPicker
              tags={tags}
              values={line.tagIds}
              onChange={(tagIds) => onUpdate({ tagIds })}
              onManage={onManageTags}
            />
          </div>
        </div>
      </div>
      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover/line:opacity-100 transition">
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
