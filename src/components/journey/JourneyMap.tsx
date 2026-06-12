import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  X,
  Layers,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useJourney } from "@/lib/journey-store";
import { EditableText } from "./EditableText";
import { CellEditor } from "./CellEditor";
import { cn } from "@/lib/utils";

const MONEY_ON_FIRE_INDEXES = new Set([2, 5, 8, 9, 10]);

type ValueKind = "capacity" | "revenue" | "cost";

function ValueTag({ value, onFire }: { value: ValueKind; onFire?: boolean }) {
  const styles: Record<ValueKind, string> = {
    capacity: "bg-teal-100 text-teal-800 border-teal-200",
    revenue: "bg-blue-100 text-blue-800 border-blue-200",
    cost: "bg-amber-100 text-amber-900 border-amber-200",
  };
  const labels: Record<ValueKind, string> = {
    capacity: "Capacity",
    revenue: "Revenue",
    cost: "Cost",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        styles[value],
        onFire && "ring-2 ring-destructive ring-offset-1 ring-offset-background",
      )}
    >
      {labels[value]}
    </span>
  );
}

// Parse "😊 Hopeful" → { emoji, label }
function parseSentiment(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { emoji: "", label: "" };
  // Match leading emoji (any non-letter/number run at start)
  const m = trimmed.match(/^(\S+)\s+(.*)$/);
  if (m && /\p{Extended_Pictographic}/u.test(m[1])) return { emoji: m[1], label: m[2] };
  return { emoji: "", label: trimmed };
}

export function JourneyMap() {
  const j = useJourney();
  const fileRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showMoneyOnFire, setShowMoneyOnFire] = useState(false);

  const sentimentLens =
    j.doc.lenses.find((l) => l.name.toLowerCase() === "sentiment") ?? j.doc.lenses[0];
  const detailLenses = j.doc.lenses.filter((l) => l.id !== sentimentLens?.id);
  const selectedStage = j.doc.stages.find((s) => s.id === selectedStageId) ?? null;
  const selectedIndex = selectedStage ? j.doc.stages.indexOf(selectedStage) : -1;
  const selectedSentiment = selectedStage && sentimentLens
    ? parseSentiment(j.doc.cells[sentimentLens.id]?.[selectedStage.id]?.lines[0]?.text ?? "")
    : null;

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

  const scrollStrip = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  const tool = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Masthead */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto max-w-[1400px] px-8 pt-7 pb-6 flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                The Fertility Partners · Patient Journey
              </div>
              <EditableText
                value={j.doc.title}
                onChange={j.setTitle}
                className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground"
              />
            </div>
            <div className="flex items-center gap-1 pt-2">
              {tool(<Layers className="h-4 w-4" />, "Add lens", j.addLens)}
              {tool(<Plus className="h-4 w-4" />, "Add stage", () => j.addStage())}
              <span className="mx-1 h-5 w-px bg-border" />
              {tool(<Download className="h-4 w-4" />, "Export JSON", exportJson)}
              {tool(<Upload className="h-4 w-4" />, "Import JSON", () => fileRef.current?.click())}
              {tool(<RotateCcw className="h-4 w-4" />, "Reset to defaults", () => {
                if (confirm("Reset to default content? Your edits will be lost.")) j.reset();
              })}
              <span className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowMoneyOnFire((v) => !v)}
                    aria-pressed={showMoneyOnFire}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium border transition",
                      showMoneyOnFire
                        ? "bg-destructive text-destructive-foreground border-destructive shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary",
                    )}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Money on fire
                  </button>
                </TooltipTrigger>
                <TooltipContent>Highlight stages losing money</TooltipContent>
              </Tooltip>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
            </div>
          </div>
        </header>

        {/* Stage strip */}
        <section className="relative">
          <div className="mx-auto max-w-[1400px] px-2 sm:px-4">
            <div className="group/strip relative">
              <button
                onClick={() => scrollStrip(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition hover:bg-secondary"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollStrip(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition hover:bg-secondary"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div
                ref={stripRef}
                className="overflow-x-auto edge-fade-x snap-x snap-mandatory scroll-px-8 pt-8 pb-10 px-6"
                style={{ scrollbarWidth: "thin" }}
              >
                <ol className="flex gap-4 items-stretch">
                  {j.doc.stages.map((s, i) => {
                    const sentimentText =
                      sentimentLens && j.doc.cells[sentimentLens.id]?.[s.id]?.lines[0]?.text;
                    const sentiment = parseSentiment(sentimentText ?? "");
                    const active = s.id === selectedStageId;
                    const dim = selectedStageId && !active;
                    const onFire = showMoneyOnFire && MONEY_ON_FIRE_INDEXES.has(i);
                    return (
                      <li
                        key={s.id}
                        className="snap-start"
                      >
                        <StageCard
                          index={i}
                          stage={s}
                          active={active}
                          dim={!!dim}
                          sentiment={sentiment}
                          onFire={onFire}
                          onSelect={() =>
                            setSelectedStageId((cur) => (cur === s.id ? null : s.id))
                          }
                          onRename={(patch) => j.setStage(s.id, patch)}
                          onMove={(dir) => j.moveStage(s.id, dir)}
                          onInsertAfter={() => j.addStage(i)}
                          onDelete={() => {
                            if (confirm(`Delete stage "${s.title}"?`)) {
                              if (selectedStageId === s.id) setSelectedStageId(null);
                              j.deleteStage(s.id);
                            }
                          }}
                        />
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Magazine spread for selected stage */}
        {selectedStage && (
          <section className="border-t border-border dot-bg">
            <div className="mx-auto max-w-[1400px] px-8 py-12">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
                {/* Feature column */}
                <div className="lg:sticky lg:top-32 self-start">
                  <div className="flex items-baseline justify-between">
                    <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Stage {String(selectedIndex + 1).padStart(2, "0")} of {j.doc.stages.length}
                    </div>
                    <button
                      onClick={() => setSelectedStageId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Collapse
                    </button>
                  </div>
                  <div className="mt-4 font-display text-[120px] leading-none font-semibold tracking-tighter text-foreground/90">
                    {String(selectedIndex + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl">
                      {selectedStage.emoji}
                    </div>
                    {selectedSentiment && (selectedSentiment.emoji || selectedSentiment.label) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                        <span className="text-sm">{selectedSentiment.emoji}</span>
                        {selectedSentiment.label}
                      </span>
                    )}
                    {selectedStage.value && (
                      <ValueTag
                        value={selectedStage.value}
                        onFire={showMoneyOnFire && MONEY_ON_FIRE_INDEXES.has(selectedIndex)}
                      />
                    )}
                  </div>
                  <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">
                    <EditableText
                      value={selectedStage.title}
                      onChange={(title) => j.setStage(selectedStage.id, { title })}
                    />
                  </h2>
                  <div className="mt-3 text-base text-muted-foreground max-w-md">
                    <EditableText
                      multiline
                      value={selectedStage.subtitle}
                      onChange={(subtitle) => j.setStage(selectedStage.id, { subtitle })}
                    />
                  </div>
                </div>

                {/* Lens bento */}
                <div className="grid gap-4 sm:grid-cols-2 auto-rows-min">
                  {detailLenses.map((lens, idx) => {
                    const cell = j.doc.cells[lens.id]?.[selectedStage.id] ?? { lines: [{ text: "" }] };
                    // First card spans 2 cols for editorial feel
                    const span = idx === 0 ? "sm:col-span-2" : "";
                    return (
                      <article
                        key={lens.id}
                        className={cn(
                          "group/lens rounded-2xl border border-border bg-card p-6 transition-shadow",
                          span,
                        )}
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        <header className="flex items-center justify-between mb-4">
                          <EditableText
                            value={lens.name}
                            onChange={(name) => j.setLens(lens.id, name)}
                            className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                data-no-toggle
                                className="opacity-0 group-hover/lens:opacity-100 text-muted-foreground hover:text-foreground transition"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => j.moveLens(lens.id, -1)}>
                                Move up
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => j.moveLens(lens.id, 1)}>
                                Move down
                              </DropdownMenuItem>
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
                        </header>
                        <CellEditor
                          cell={cell}
                          onChange={(c) => j.setCell(lens.id, selectedStage.id, c)}
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {!selectedStage && (
          <div className="mx-auto max-w-[1400px] px-8 pb-16 pt-2">
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Begin
              </div>
              <p className="mt-2 font-display text-2xl tracking-tight">
                Select a stage above to read its lenses.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every text is editable. Changes auto-save in your browser.
              </p>
            </div>
          </div>
        )}

        <footer className="border-t border-border px-8 py-8 text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Auto-saved locally · Click any text to edit
        </footer>
      </div>
    </TooltipProvider>
  );
}

type StageCardProps = {
  index: number;
  stage: { id: string; emoji: string; title: string; subtitle: string; value?: ValueKind };
  active: boolean;
  dim: boolean;
  sentiment: { emoji: string; label: string };
  onFire: boolean;
  onSelect: () => void;
  onRename: (patch: Partial<{ emoji: string; title: string; subtitle: string }>) => void;
  onMove: (dir: -1 | 1) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
};

function StageCard({
  index,
  stage,
  active,
  dim,
  sentiment,
  onFire,
  onSelect,
  onRename,
  onMove,
  onInsertAfter,
  onDelete,
}: StageCardProps) {
  return (
    <div
      role="button"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("input, textarea, [data-no-toggle]")) return;
        onSelect();
      }}
      className={cn(
        "group/card relative h-full w-[280px] cursor-pointer rounded-2xl border bg-card p-5 transition-all duration-200",
        active
          ? "border-primary/40 -translate-y-1"
          : "border-border hover:-translate-y-0.5 hover:border-foreground/15",
        dim && "opacity-55",
      )}
      style={{ boxShadow: active ? "var(--shadow-card)" : undefined }}
    >
      {/* Top: numeral + menu */}
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "font-display text-3xl font-semibold tracking-tight",
            active ? "text-primary" : "text-muted-foreground/70",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-no-toggle
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover/card:opacity-100 text-muted-foreground hover:text-foreground transition"
              aria-label="Stage options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMove(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Move left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(1)}>
              <ChevronRight className="h-4 w-4 mr-2" /> Move right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertAfter}>
              <Plus className="h-4 w-4 mr-2" /> Insert after
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Glyph */}
      <div className="mt-4 h-14 w-14 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl">
        <EditableText
          value={stage.emoji}
          onChange={(emoji) => onRename({ emoji })}
          className="leading-none"
        />
      </div>

      {/* Title + subtitle */}
      <div className="mt-4">
        <EditableText
          value={stage.title}
          onChange={(title) => onRename({ title })}
          className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground"
        />
        {stage.value && (
          <div className="mt-2">
            <ValueTag value={stage.value} onFire={onFire} />
          </div>
        )}
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground line-clamp-3">
          <EditableText
            multiline
            value={stage.subtitle}
            onChange={(subtitle) => onRename({ subtitle })}
          />
        </div>
      </div>

      {/* Sentiment pill */}
      <div className="mt-5 pt-4 border-t border-border/70">
        {sentiment.emoji || sentiment.label ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80",
            )}
          >
            <span className="text-sm leading-none">{sentiment.emoji}</span>
            {sentiment.label}
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            No sentiment
          </span>
        )}
      </div>

      {/* Active accent bar */}
      {active && (
        <span className="absolute left-5 right-5 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
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