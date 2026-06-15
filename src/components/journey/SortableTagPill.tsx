import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";
import { TAG_PILL } from "./tag-colors";

type Props = {
  tag: Tag;
  onRemove: () => void;
};

export function SortableTagPill({ tag, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex items-center rounded-full border text-[10.5px] font-semibold uppercase tracking-wider transition shrink-0",
        TAG_PILL[tag.color as keyof typeof TAG_PILL] ?? TAG_PILL.slate,
        isDragging && "shadow-md",
      )}
    >
      <button
        type="button"
        data-no-toggle
        aria-label={`Drag to reorder ${tag.name}`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="pl-2 pr-1 py-0.5 cursor-grab active:cursor-grabbing touch-none"
      >
        {tag.name}
      </button>
      <button
        type="button"
        data-no-toggle
        title={`Remove ${tag.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="pr-2 pl-0.5 py-0.5 opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
}