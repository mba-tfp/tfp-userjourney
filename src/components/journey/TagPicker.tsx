import { Check, Plus, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";
import { TAG_DOT } from "./tag-colors";
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableTagPill } from "./SortableTagPill";

type Props = {
  tags: Tag[];
  values: string[];
  onChange: (next: string[]) => void;
  onManage: () => void;
  placeholder?: string;
  manageLabel?: string;
};

export function TagPicker({
  tags,
  values,
  onChange,
  onManage,
  placeholder = "Tag",
  manageLabel = "Manage tags…",
}: Props) {
  // Preserve the order stored in `values` (drag order), not the registry order.
  const selected = values
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);
  const toggle = (id: string) => {
    const next = values.includes(id)
      ? values.filter((v) => v !== id)
      : [...values, id];
    onChange(Array.from(new Set(next)));
  };
  const remove = (id: string) => onChange(values.filter((v) => v !== id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = values.indexOf(String(active.id));
    const newIndex = values.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(values, oldIndex, newIndex));
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {selected.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={selected.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            <span className="inline-flex flex-wrap items-center gap-1">
              {selected.map((t) => (
                <SortableTagPill key={t.id} tag={t} onRemove={() => remove(t.id)} />
              ))}
            </span>
          </SortableContext>
        </DndContext>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-no-toggle
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition shrink-0",
              "border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-label={selected.length ? "Add another tag" : placeholder}
          >
            <Plus className="h-3 w-3" />
            {selected.length === 0 && <span>{placeholder}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          {tags.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No tags yet</div>
          )}
          {tags.map((t) => {
            const on = values.includes(t.id);
            return (
              <DropdownMenuItem
                key={t.id}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle(t.id);
                }}
              >
                <span
                  className={cn(
                    "mr-2 h-2.5 w-2.5 rounded-full",
                    TAG_DOT[t.color as keyof typeof TAG_DOT] ?? TAG_DOT.slate,
                  )}
                />
                <span className="flex-1">{t.name}</span>
                {on && <Check className="h-3.5 w-3.5 ml-2 text-foreground/70" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManage}>
            <Settings2 className="h-3.5 w-3.5 mr-2" /> {manageLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}