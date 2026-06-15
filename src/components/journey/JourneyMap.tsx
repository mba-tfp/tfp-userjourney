import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus,
  LogOut,
  X,
  Tag as TagIcon,
  Flame,
  ListChecks,
  LayoutGrid,
  Undo2,
  Redo2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useJourney } from "@/lib/journey-store";
import { EditableText } from "./EditableText";
import { LineListCard } from "./LineListCard";
import { StageLifecycle } from "./StageLifecycle";
import { TagPicker } from "./TagPicker";
import type { Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

function ValueTag({
  valueTagIds,
  valueTags,
  onFire,
  onChange,
  onManage,
}: {
  valueTagIds: string[];
  valueTags: Tag[];
  onFire?: boolean;
  onChange: (next: string[]) => void;
  onManage: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full",
        onFire && "ring-2 ring-destructive ring-offset-1 ring-offset-background",
      )}
    >
      <TagPicker
        tags={valueTags}
        values={valueTagIds}
        onChange={onChange}
        onManage={onManage}
        placeholder="Set value"
        manageLabel="Manage value tags…"
      />
    </span>
  );
}

export function JourneyMap() {
  const j = useJourney();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showMoneyOnFire, setShowMoneyOnFire] = useState(false);
  const navigate = useNavigate();
  const openTagManager = () => navigate({ to: "/tags" });
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const selectedStage = j.doc.stages.find((s) => s.id === selectedStageId) ?? null;
  const selectedIndex = selectedStage ? j.doc.stages.indexOf(selectedStage) : -1;
  const stageLines = selectedStage ? j.doc.lines[selectedStage.id] ?? [] : [];
  const existsLines = stageLines.filter((l) => l.exists);
  const gapLines = stageLines.filter((l) => !l.exists);

  const lineCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of j.doc.stages) m[s.id] = (j.doc.lines[s.id] ?? []).length;
    return m;
  }, [j.doc.stages, j.doc.lines]);

  const fireCount = useMemo(
    () => j.doc.stages.reduce((acc, s) => acc + (s.onFire ? 1 : 0), 0),
    [j.doc.stages],
  );

  if (!j.hydrated) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto max-w-[1400px] px-8 pt-7 pb-6">
          <div className="h-3 w-48 rounded bg-secondary animate-pulse" />
          <div className="mt-3 h-9 w-96 max-w-full rounded bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

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

  const toolDisabled = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled: boolean,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
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
      <div className="min-h-dvh bg-background text-foreground">
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
              {toolDisabled(<Undo2 className="h-4 w-4" />, "Undo (⌘Z)", j.undo, !j.canUndo)}
              {toolDisabled(<Redo2 className="h-4 w-4" />, "Redo (⇧⌘Z)", j.redo, !j.canRedo)}
              <span className="mx-1 h-5 w-px bg-border" />
              {tool(<TagIcon className="h-4 w-4" />, "Manage tags", openTagManager)}
              {tool(
                <ListChecks className="h-4 w-4" />,
                "Conclusion / Roadmap",
                () => navigate({ to: "/conclusion" }),
              )}
              {tool(
                <LayoutGrid className="h-4 w-4" />,
                "Priority quadrant",
                () => navigate({ to: "/quadrant" }),
              )}
              {tool(<Plus className="h-4 w-4" />, "Add stage", () => j.addStage())}
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
                    {fireCount > 0 && (
                      <span
                        className={cn(
                          "ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                          showMoneyOnFire
                            ? "bg-destructive-foreground/15 text-destructive-foreground"
                            : "bg-secondary text-foreground/80",
                        )}
                      >
                        {fireCount}/{j.doc.stages.length}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Highlight stages losing money</TooltipContent>
              </Tooltip>
              <span className="mx-1 h-5 w-px bg-border" />
              {tool(<LogOut className="h-4 w-4" />, "Sign out", signOut)}
            </div>
          </div>
        </header>

        <main>
        {/* Stage lifecycle ring */}
        <section className="relative">
          <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-10">
            <StageLifecycle
              stages={j.doc.stages}
              valueTags={j.doc.valueTags}
              selectedStageId={selectedStageId}
              showMoneyOnFire={showMoneyOnFire}
              lineCounts={lineCounts}
              onSelect={(id) =>
                setSelectedStageId((cur) => (cur === id ? null : id))
              }
              onDeselect={() => setSelectedStageId(null)}
              onRename={(id, patch) => j.setStage(id, patch)}
              onValueChange={(id, valueTagIds) => j.setStage(id, { valueTagIds })}
              onToggleOnFire={(id) => j.toggleStageOnFire(id)}
              onManageValueTags={openTagManager}
              onMove={(id, dir) => j.moveStage(id, dir)}
              onInsertAfter={(i) => j.addStage(i)}
              onDelete={(s) => {
                if (confirm(`Delete stage "${s.title}"?`)) {
                  if (selectedStageId === s.id) setSelectedStageId(null);
                  j.deleteStage(s.id);
                }
              }}
            />
            {/* Mobile-only stage picker — labels are hidden around the ring under sm: */}
            <div className="mt-6 sm:hidden">
              <ol className="grid grid-cols-1 gap-1.5">
                {j.doc.stages.map((s, i) => {
                  const active = s.id === selectedStageId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStageId((cur) => (cur === s.id ? null : s.id))
                        }
                        aria-pressed={active}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                          active
                            ? "border-foreground bg-secondary/60"
                            : "border-border hover:bg-secondary/40",
                        )}
                      >
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 truncate">{s.title}</span>
                        {(lineCounts[s.id] ?? 0) === 0 && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            empty
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
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
                  <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <div className="h-12 w-12 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl">
                      {selectedStage.emoji}
                    </div>
                    <ValueTag
                      valueTagIds={selectedStage.valueTagIds}
                      valueTags={j.doc.valueTags}
                      onFire={showMoneyOnFire && !!selectedStage.onFire}
                      onChange={(valueTagIds) => j.setStage(selectedStage.id, { valueTagIds })}
                      onManage={openTagManager}
                    />
                    <button
                      onClick={() => j.toggleStageOnFire(selectedStage.id)}
                      aria-pressed={!!selectedStage.onFire}
                      title={selectedStage.onFire ? "Unmark money on fire" : "Mark money on fire"}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition",
                        selectedStage.onFire
                          ? "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary",
                      )}
                    >
                      <Flame className="h-3 w-3" /> Money on fire
                    </button>
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
                <div className="grid gap-5 md:grid-cols-2 items-start">
                  <LineListCard
                    title="What Exists Today"
                    subtitle="Tools, processes, and assets in place today."
                    lines={existsLines}
                    tags={j.doc.tags}
                    onAddLine={() => j.addLine(selectedStage.id, true)}
                    onUpdateLine={(id, patch) => j.updateLine(selectedStage.id, id, patch)}
                    onDeleteLine={(id) => j.deleteLine(selectedStage.id, id)}
                    onMoveLine={(id, dir) => j.moveLine(selectedStage.id, id, dir)}
                    onManageTags={openTagManager}
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
                    onManageTags={openTagManager}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        </main>
      </div>
    </TooltipProvider>
  );
}
