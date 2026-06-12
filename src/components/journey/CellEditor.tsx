import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableText } from "./EditableText";
import type { Cell } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  cell: Cell;
  onChange: (c: Cell) => void;
};

export function CellEditor({ cell, onChange }: Props) {
  const lines = cell.lines.length ? cell.lines : [{ text: "" }];

  const updateLine = (i: number, patch: Partial<{ text: string; gap: boolean }>) => {
    const next = lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange({ lines: next });
  };
  const addLine = () => onChange({ lines: [...lines, { text: "" }] });
  const removeLine = (i: number) =>
    onChange({ lines: lines.filter((_, idx) => idx !== i).length ? lines.filter((_, idx) => idx !== i) : [{ text: "" }] });

  return (
    <div className="group/cell space-y-1.5 text-[12px] leading-snug">
      {lines.map((line, i) => (
        <div key={i} className="group/line flex items-start gap-1">
          <button
            title={line.gap ? "Marked as gap (click to clear)" : "Mark as gap"}
            onClick={() => updateLine(i, { gap: !line.gap })}
            className={cn(
              "mt-0.5 shrink-0 rounded p-0.5 opacity-0 group-hover/line:opacity-100 transition",
              line.gap && "opacity-100 text-destructive",
            )}
          >
            <AlertCircle className="h-3 w-3" />
          </button>
          <EditableText
            multiline
            value={line.text}
            onChange={(v) => updateLine(i, { text: v })}
            placeholder="…"
            className={cn("flex-1", line.gap && "text-destructive font-medium")}
          />
          <button
            onClick={() => removeLine(i)}
            title="Remove line"
            className="mt-0.5 opacity-0 group-hover/line:opacity-100 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={addLine}
        className="h-6 px-1 text-[11px] text-muted-foreground opacity-0 group-hover/cell:opacity-100"
      >
        <Plus className="h-3 w-3 mr-1" /> line
      </Button>
    </div>
  );
}