import { Settings2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";
import { TAG_DOT, TAG_PILL } from "./tag-colors";

type Props = {
  tags: Tag[];
  value?: string;
  onChange: (tagId: string | undefined) => void;
  onManage: () => void;
  placeholder?: string;
  manageLabel?: string;
};

export function TagPicker({ tags, value, onChange, onManage, placeholder = "Tag", manageLabel = "Manage tags…" }: Props) {
  const tag = tags.find((t) => t.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-no-toggle
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition shrink-0",
            tag
              ? TAG_PILL[tag.color as keyof typeof TAG_PILL] ?? TAG_PILL.slate
              : "border-dashed border-border bg-transparent text-muted-foreground hover:bg-secondary",
          )}
        >
          {tag ? tag.name : placeholder}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {tags.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => onChange(t.id)}>
            <span className={cn("mr-2 h-2.5 w-2.5 rounded-full", TAG_DOT[t.color as keyof typeof TAG_DOT] ?? TAG_DOT.slate)} />
            {t.name}
          </DropdownMenuItem>
        ))}
        {value && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(undefined)}>
              <X className="h-3.5 w-3.5 mr-2" /> Clear tag
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onManage}>
          <Settings2 className="h-3.5 w-3.5 mr-2" /> {manageLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}