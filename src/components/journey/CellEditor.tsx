import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { EditableText } from "./EditableText";
import type { Cell } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  cell: Cell;
  onChange: (c: Cell) => void;
  density?: "compact" | "comfortable";
};

export function CellEditor({ cell, onChange, density = "comfortable" }: Props) {
  const lines = cell.lines.length ? cell.lines : [{ text: "" }];

  const updateLine = (i: number, patch: Partial<{ text: string; gap: boolean }>) => {
    onChange({ lines: lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  };
  const addLine = () => onChange({ lines: [...lines, { text: "" }] });
  const removeLine = (i: number) => {
    const next = lines.filter((_, idx) => idx !== i);
    onChange({ lines: next.length ? next : [{ text: "" }] });
  };

  const textSize = density === "compact" ? "text-[12px] leading-snug" : "text-[13.5px] leading-relaxed";

  return (
    <div className={cn("group/cell space-y-2", textSize)}>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "group/line relative rounded-lg px-3 py-2 transition-colors",
            line.gap
              ? "bg-destructive/8 text-destructive border border-destructive/20"
              : "bg-secondary/40 border border-transparent hover:border-border",
          )}
        >
          <div className="flex items-start gap-2">
            {line.gap ? (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
            ) : (
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            )}
            <EditableText
              multiline
              value={line.text}
              onChange={(v) => updateLine(i, { text: v })}
              placeholder="Add a note…"
              className={cn("flex-1 min-w-0", line.gap && "font-medium")}
            />
            <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover/line:opacity-100 transition">
              <button
                title={line.gap ? "Unmark gap" : "Mark as gap"}
                onClick={() => updateLine(i, { gap: !line.gap })}
                className="rounded p-1 hover:bg-background/80 text-muted-foreground hover:text-destructive"
              >
                <AlertTriangle className="h-3 w-3" />
              </button>
              <button
                title="Remove"
                onClick={() => removeLine(i)}
                className="rounded p-1 hover:bg-background/80 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addLine}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground opacity-0 group-hover/cell:opacity-100 transition"
      >
        <Plus className="h-3 w-3" /> Add line
      </button>
    </div>
  );
}