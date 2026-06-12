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
  Tag as TagIcon,
  Flame,
} from "lucide-react";
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
import { LineRow } from "./LineRow";
import { TagManagerDialog } from "./TagManagerDialog";
import { cn } from "@/lib/utils";

const MONEY_ON_FIRE_INDEXES = new Set([2, 5, 8, 9, 10]);

type ValueKind = "capacity" | "revenue" | "cost";

const VALUE_STYLES: Record<ValueKind, string> = {
  capacity: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
  revenue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  cost: "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200",
};
const VALUE_LABELS: Record<ValueKind, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  cost: "Cost",
};

function ValueTag({
  value,
  onFire,
  onChange,
}: {
  value?: ValueKind;
  onFire?: boolean;
  onChange: (next: ValueKind) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-no-toggle
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition",
            value
              ? VALUE_STYLES[value]
              : "border-dashed border-border bg-transparent text-muted-foreground hover:bg-secondary",
            onFire && "ring-2 ring-destructive ring-offset-1 ring-offset-background",
          )}
        >
          {value ? VALUE_LABELS[value] : "Set value"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(VALUE_LABELS) as ValueKind[]).map((k) => (
          <DropdownMenuItem key={k} onClick={() => onChange(k)}>
            <span className={cn("mr-2 h-2.5 w-2.5 rounded-full border", VALUE_STYLES[k])} />
            {VALUE_LABELS[k]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function JourneyMap() {
  const j = useJourney();
  const fileRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showMoneyOnFire, setShowMoneyOnFire] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const selectedStage = j.doc.stages.find((s) => s.id === selectedStageId) ?? null;
  const selectedIndex = selectedStage ? j.doc.stages.indexOf(selectedStage) : -1;
  const stageLines = selectedStage ? j.doc.lines[selectedStage.id] ?? [] : [];
  const existsLines = stageLines.filter((l) => l.exists);
  const gapLines = stageLines.filter((l) => !l.exists);

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
              {tool(<TagIcon className="h-4 w-4" />, "Manage tags", () => setTagManagerOpen(true))}
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
                          onFire={onFire}
                          onSelect={() =>
                            setSelectedStageId((cur) => (cur === s.id ? null : s.id))
                          }
                          onRename={(patch) => j.setStage(s.id, patch)}
                          onValueChange={(value) => j.setStage(s.id, { value })}
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
                    <ValueTag
                      value={selectedStage.value}
                      onFire={showMoneyOnFire && MONEY_ON_FIRE_INDEXES.has(selectedIndex)}
                      onChange={(value) => j.setStage(selectedStage.id, { value })}
                    />
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

                {/* Exists / Doesn't Exist cards */}
                <div className="space-y-5">
                  <LineListCard
                    title="What Exists Today"
                    subtitle="Tools, processes, and assets in place today."
                    lines={existsLines}
                    tags={j.doc.tags}
                    onAddLine={() => j.addLine(selectedStage.id, true)}
                    onUpdateLine={(id, patch) => j.updateLine(selectedStage.id, id, patch)}
                    onDeleteLine={(id) => j.deleteLine(selectedStage.id, id)}
                    onMoveLine={(id, dir) => j.moveLine(selectedStage.id, id, dir)}
                    onManageTags={() => setTagManagerOpen(true)}
                  />
                  <LineListCard
                    title="What Doesn't Exist Today"
                    subtitle="Gaps, missing capabilities, broken handoffs."
                    accent="destructive"
                    lines={gapLines}
                    tags={j.doc.tags}
                    onAddLine={() => j.addLine(selectedStage.id, false)}
                    onUpdateLine={(id, patch) => j.updateLine(selectedStage.id, id, patch)}
                    onDeleteLine={(id) => j.deleteLine(selectedStage.id, id)}
                    onMoveLine={(id, dir) => j.moveLine(selectedStage.id, id, dir)}
                    onManageTags={() => setTagManagerOpen(true)}
                  />
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
      <TagManagerDialog
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={j.doc.tags}
        onAdd={() => j.addTag()}
        onRename={j.renameTag}
        onSetColor={j.setTagColor}
        onDelete={j.deleteTag}
      />
    </TooltipProvider>
  );
}

type StageCardProps = {
  index: number;
  stage: { id: string; emoji: string; title: string; subtitle: string; value?: ValueKind };
  active: boolean;
  dim: boolean;
  onFire: boolean;
  onSelect: () => void;
  onRename: (patch: Partial<{ emoji: string; title: string; subtitle: string }>) => void;
  onValueChange: (value: ValueKind) => void;
  onMove: (dir: -1 | 1) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
};

function StageCard({
  index,
  stage,
  active,
  dim,
  onFire,
  onSelect,
  onRename,
  onValueChange,
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
        <div className="mt-2">
          <ValueTag value={stage.value} onFire={onFire} onChange={onValueChange} />
        </div>
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground line-clamp-3">
          <EditableText
            multiline
            value={stage.subtitle}
            onChange={(subtitle) => onRename({ subtitle })}
          />
        </div>
      </div>

      {/* Active accent bar */}
      {active && (
        <span className="absolute left-5 right-5 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
    </div>
  );
}

type LineListCardProps = {
  title: string;
  subtitle?: string;
  accent?: "default" | "destructive";
  lines: import("@/lib/journey-data").Line[];
  tags: import("@/lib/journey-data").Tag[];
  onAddLine: () => void;
  onUpdateLine: (id: string, patch: Partial<import("@/lib/journey-data").Line>) => void;
  onDeleteLine: (id: string) => void;
  onMoveLine: (id: string, dir: -1 | 1) => void;
  onManageTags: () => void;
};

function LineListCard({
  title,
  subtitle,
  accent = "default",
  lines,
  tags,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onMoveLine,
  onManageTags,
}: LineListCardProps) {
  const isGap = accent === "destructive";
  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-6 transition-shadow",
        isGap ? "border-destructive/25" : "border-border",
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3
            className={cn(
              "font-display text-lg font-semibold tracking-tight",
              isGap ? "text-destructive" : "text-foreground",
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {lines.length}
        </span>
      </header>
      <div className="space-y-2">
        {lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            tags={tags}
            isGap={isGap}
            onChange={(patch) => onUpdateLine(line.id, patch)}
            onDelete={() => onDeleteLine(line.id)}
            onMove={(dir) => onMoveLine(line.id, dir)}
            onToggleExists={() => onUpdateLine(line.id, { exists: !line.exists })}
            onManageTags={onManageTags}
          />
        ))}
        {lines.length === 0 && (
          <p className="text-[12.5px] italic text-muted-foreground py-2">
            Nothing here yet.
          </p>
        )}
      </div>
      <button
        onClick={onAddLine}
        className="mt-3 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
      >
        <Plus className="h-3 w-3" /> Add line
      </button>
    </article>
  );
}