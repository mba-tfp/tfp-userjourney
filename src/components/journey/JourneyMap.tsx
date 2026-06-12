import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical, Plus, Trash2, Download, Upload, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJourney } from "@/lib/journey-store";
import { EditableText } from "./EditableText";
import { CellEditor } from "./CellEditor";

export function JourneyMap() {
  const j = useJourney();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const sentimentLens =
    j.doc.lenses.find((l) => l.name.toLowerCase() === "sentiment") ?? j.doc.lenses[0];
  const detailLenses = j.doc.lenses.filter((l) => l.id !== sentimentLens?.id);
  const selectedStage = j.doc.stages.find((s) => s.id === selectedStageId) ?? null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(j.doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${j.doc.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      j.importDoc(JSON.parse(text));
    } catch {
      alert("Invalid JSON file");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center gap-4">
        <EditableText
          value={j.doc.title}
          onChange={j.setTitle}
          className="text-2xl font-semibold tracking-tight text-primary"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={j.addLens}>
            <Plus className="h-4 w-4 mr-1" /> Lens
          </Button>
          <Button variant="outline" size="sm" onClick={() => j.addStage()}>
            <Plus className="h-4 w-4 mr-1" /> Stage
          </Button>
          <Button variant="ghost" size="sm" onClick={exportJson}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Reset to default content? Your edits will be lost.")) j.reset();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>
      </header>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `180px repeat(${j.doc.stages.length}, minmax(220px, 1fr))`,
          }}
        >
          {/* Column headers */}
          <div className="sticky left-0 z-20 bg-background border-b border-r p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Stage
          </div>
          {j.doc.stages.map((s, i) => (
            <div
              key={s.id}
              role="button"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("input, textarea, [data-no-toggle]")) return;
                setSelectedStageId((cur) => (cur === s.id ? null : s.id));
              }}
              className={
                "border-b border-r p-3 group/header cursor-pointer transition-colors " +
                (selectedStageId === s.id
                  ? "bg-accent/60 ring-2 ring-primary/40"
                  : "hover:bg-accent/30")
              }
            >
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Stage {i + 1}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-no-toggle
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover/header:opacity-100 transition"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => j.moveStage(s.id, -1)}>
                      <ChevronLeft className="h-4 w-4 mr-2" /> Move left
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => j.moveStage(s.id, 1)}>
                      <ChevronRight className="h-4 w-4 mr-2" /> Move right
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => j.addStage(i)}>
                      <Plus className="h-4 w-4 mr-2" /> Insert after
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete stage "${s.title}"?`)) j.deleteStage(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 text-center">
                <EditableText
                  value={s.emoji}
                  onChange={(emoji) => j.setStage(s.id, { emoji })}
                  className="text-3xl inline-block"
                />
              </div>
              <EditableText
                value={s.title}
                onChange={(title) => j.setStage(s.id, { title })}
                className="mt-1 text-center font-semibold text-foreground"
              />
              <EditableText
                value={s.subtitle}
                onChange={(subtitle) => j.setStage(s.id, { subtitle })}
                multiline
                className="mt-1 text-center text-[11px] text-muted-foreground"
              />
            </div>
          ))}

          {/* Rows */}
          {j.doc.lenses.map((lens) => (
            <Row key={lens.id} j={j} lensId={lens.id} />
          ))}
        </div>
      </div>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Auto-saved locally • Click any text to edit • Hover a cell for line and gap controls
      </footer>
    </div>
  );
}

function Row({ j, lensId }: { j: ReturnType<typeof useJourney>; lensId: string }) {
  const lens = j.doc.lenses.find((l) => l.id === lensId)!;
  return (
    <>
      <div className="sticky left-0 z-10 bg-background border-b border-r p-3 group/lens flex items-start justify-between gap-1">
        <EditableText
          value={lens.name}
          onChange={(name) => j.setLens(lens.id, name)}
          className="text-sm font-semibold uppercase tracking-wide text-foreground"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover/lens:opacity-100 text-muted-foreground">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => j.moveLens(lens.id, -1)}>Move up</DropdownMenuItem>
            <DropdownMenuItem onClick={() => j.moveLens(lens.id, 1)}>Move down</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete lens "${lens.name}"?`)) j.deleteLens(lens.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {j.doc.stages.map((s) => {
        const cell = j.doc.cells[lens.id]?.[s.id] ?? { lines: [{ text: "" }] };
        return (
          <div key={s.id} className="border-b border-r p-3 align-top">
            <CellEditor cell={cell} onChange={(c) => j.setCell(lens.id, s.id, c)} />
          </div>
        );
      })}
    </>
  );
}