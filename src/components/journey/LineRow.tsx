import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { EditableTextModal } from "./EditableTextModal";
import { TagPicker } from "./TagPicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Line, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  line: Line;
  tags: Tag[];
  onChange: (patch: Partial<Line>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onToggleExists: () => void;
  onManageTags: () => void;
  isGap?: boolean;
};

export function LineRow({
  line,
  tags,
  onChange,
  onMove,
  onDelete,
  onToggleExists,
  onManageTags,
  isGap,
}: Props) {
  return (
    <div
      className={cn(
        "group/line relative flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        isGap
          ? "border-destructive/20 bg-destructive/[0.04]"
          : "border-transparent bg-secondary/40 hover:border-border",
      )}
    >
      <div className="pt-0.5">
        <TagPicker
          tags={tags}
          values={line.tagIds}
          onChange={(tagIds) => onChange({ tagIds })}
          onManage={onManageTags}
        />
      </div>
      <EditableTextModal
        multiline
        value={line.text}
        onChange={(text) => onChange({ text })}
        placeholder="Add a note…"
        className="flex-1 min-w-0 text-[13.5px] leading-relaxed"
        label="Edit line"
      />
      <div className="flex-shrink-0 self-start pt-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Line options"
              className="rounded p-1 text-muted-foreground opacity-0 group-hover/line:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 hover:bg-background/80 hover:text-foreground transition"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onMove(-1)}>
              <ChevronUp className="h-4 w-4 mr-2" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(1)}>
              <ChevronDown className="h-4 w-4 mr-2" /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleExists}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {isGap ? "Move to Exists Today" : "Move to Doesn't Exist Today"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}