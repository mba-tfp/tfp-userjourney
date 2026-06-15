import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Flame, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Stage, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  stages: Stage[];
  valueTags: Tag[];
  selectedStageId: string | null;
  showMoneyOnFire: boolean;
  lineCounts?: Record<string, number>;
  onSelect: (id: string) => void;
  onRename?: (id: string, patch: Partial<Stage>) => void;
  onValueChange?: (id: string, valueTagId: string | undefined) => void;
  onManageValueTags?: () => void;
  onToggleOnFire: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onInsertAfter: (index: number) => void;
  onDelete: (stage: Stage) => void;
  onDeselect?: () => void;
};

export function StageLifecycle({
  stages,
  valueTags,
  selectedStageId,
  showMoneyOnFire,
  lineCounts,
  onSelect,
  onToggleOnFire,
  onMove,
  onInsertAfter,
  onDelete,
  onDeselect,
}: Props) {
  const n = stages.length;
  if (n === 0) return null;

  const VB = 1000;
  const cx = VB / 2;
  const cy = VB / 2;
  const nodeSize = 52;
  const ringRadius = VB / 2 - 200;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i: number) => ({
    x: cx + ringRadius * Math.cos(angleFor(i)),
    y: cy + ringRadius * Math.sin(angleFor(i)),
  });

  const selectedIndex = selectedStageId
    ? stages.findIndex((s) => s.id === selectedStageId)
    : -1;
  const selected = selectedIndex >= 0 ? stages[selectedIndex] : null;
  const selectedValueTag = selected
    ? valueTags.find((t) => t.id === selected.valueTagId)
    : null;

  const labelOffset = nodeSize / 2 + 18;

  const emptyCount = lineCounts
    ? stages.reduce((acc, s) => acc + ((lineCounts[s.id] ?? 0) === 0 ? 1 : 0), 0)
    : 0;

  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (n === 0) return;
      const key = e.key;
      if (key === "Escape" && selectedStageId) {
        e.preventDefault();
        onDeselect?.();
        return;
      }
      const idx = selectedIndex >= 0 ? selectedIndex : 0;
      if (key === "ArrowRight" || key === "ArrowDown") {
        e.preventDefault();
        const next = selectedStageId ? (idx + 1) % n : 0;
        onSelect(stages[next].id);
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        e.preventDefault();
        const next = selectedStageId ? (idx - 1 + n) % n : n - 1;
        onSelect(stages[next].id);
      } else if (key === "Home") {
        e.preventDefault();
        onSelect(stages[0].id);
      } else if (key === "End") {
        e.preventDefault();
        onSelect(stages[n - 1].id);
      }
    },
    [n, selectedIndex, selectedStageId, stages, onSelect, onDeselect],
  );

  // Move focus to the active node when selection changes via keyboard
  useEffect(() => {
    if (!selectedStageId || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-stage-id="${selectedStageId}"]`,
    );
    if (el && document.activeElement !== el && containerRef.current.contains(document.activeElement)) {
      el.focus();
    }
  }, [selectedStageId]);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Patient journey stages"
      className="mx-auto w-full max-w-[min(680px,92vw)] aspect-square relative"
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full">
        {/* Single hairline ring — no dashes, no badges, no arrows */}
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        {/* Active arc: from previous node to selected node */}
        {selected && (() => {
          const prev = (selectedIndex - 1 + n) % n;
          const a1 = angleFor(prev);
          const a2 = angleFor(selectedIndex);
          const start = { x: cx + ringRadius * Math.cos(a1), y: cy + ringRadius * Math.sin(a1) };
          const end = { x: cx + ringRadius * Math.cos(a2), y: cy + ringRadius * Math.sin(a2) };
          return (
            <path
              d={`M ${start.x} ${start.y} A ${ringRadius} ${ringRadius} 0 0 1 ${end.x} ${end.y}`}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })()}
      </svg>

      {/* Center summary — slim when a stage is selected (title lives in the spread below) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center max-w-[58%]">
          {selected ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground">
                STAGE {String(selectedIndex + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              {selectedValueTag ? (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase text-foreground/80">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: selectedValueTag.color }}
                  />
                  {selectedValueTag.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground/40" />
                  No value
                </span>
              )}
              <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70">
                Details below
              </span>
            </div>
          ) : (
            <>
              <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
                {n} STAGES{emptyCount > 0 ? ` · ${emptyCount} EMPTY` : ""}
              </span>
              <h3 className="mt-2 font-display text-xl leading-tight tracking-tight text-foreground">
                Select a stage
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Click a node or use the arrow keys
              </p>
            </>
          )}
        </div>
      </div>

      {stages.map((s, i) => {
        const p = pointFor(i);
        const angle = angleFor(i);
        const sizePct = (nodeSize / VB) * 100;
        const active = s.id === selectedStageId;
        const dim = !!selectedStageId && !active;
        const onFire = showMoneyOnFire && !!s.onFire;
        const valueTag = valueTags.find((t) => t.id === s.valueTagId);
        const isEmpty = !!lineCounts && (lineCounts[s.id] ?? 0) === 0;

        const labelDx = Math.cos(angle) * labelOffset;
        const labelDy = Math.sin(angle) * labelOffset;
        const isTop = labelDy < -10;
        const isBottom = labelDy > 10;
        const isLeft = labelDx < -10;
        const isRight = labelDx > 10;
        const align = isLeft
          ? "items-end text-right"
          : isRight
            ? "items-start text-left"
            : "items-center text-center";
        const translate = `translate(${
          isLeft ? "-100%" : isRight ? "0" : "-50%"
        }, ${isTop ? "-100%" : isBottom ? "0" : "-50%"})`;

        return (
          <div key={s.id}>
            <div
              className="absolute"
              style={{
                left: `${(p.x / VB) * 100}%`,
                top: `${(p.y / VB) * 100}%`,
                width: `${sizePct}%`,
                height: `${sizePct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <StageNode
                stage={s}
                index={i}
                active={active}
                dim={dim}
                onFire={onFire}
                isEmpty={isEmpty}
                valueColor={valueTag?.color}
                onSelect={() => onSelect(s.id)}
                onToggleOnFire={() => onToggleOnFire(s.id)}
                onMove={(dir) => onMove(s.id, dir)}
                onInsertAfter={() => onInsertAfter(i)}
                onDelete={() => onDelete(s)}
              />
            </div>
            <div
              className={cn(
                "absolute pointer-events-none hidden sm:flex flex-col gap-0.5 max-w-[140px]",
                align,
                dim && "opacity-40",
              )}
              style={{
                left: `${((p.x + labelDx) / VB) * 100}%`,
                top: `${((p.y + labelDy) / VB) * 100}%`,
                transform: translate,
              }}
            >
              <span
                className={cn(
                  "text-[10px] font-mono tracking-wider leading-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "text-[11.5px] font-medium leading-tight",
                  active ? "text-foreground" : "text-foreground/75",
                )}
              >
                {s.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type NodeProps = {
  stage: Stage;
  index: number;
  active: boolean;
  dim: boolean;
  onFire: boolean;
  isEmpty?: boolean;
  valueColor?: string;
  onSelect: () => void;
  onToggleOnFire: () => void;
  onMove: (dir: -1 | 1) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
};

function StageNode({
  stage,
  index,
  active,
  dim,
  onFire,
  isEmpty,
  valueColor,
  onSelect,
  onToggleOnFire,
  onMove,
  onInsertAfter,
  onDelete,
}: NodeProps) {
  return (
    <div className="group/node absolute inset-0">
      <button
        type="button"
        data-stage-id={stage.id}
        aria-label={`Stage ${index + 1}: ${stage.title}${isEmpty ? " (empty)" : ""}`}
        aria-pressed={active}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-no-toggle]")) return;
          onSelect();
        }}
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-background transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isEmpty
            ? "border border-dashed border-border/70"
            : "border border-border",
          active && "border-foreground border-solid scale-110 shadow-sm",
          !active && "hover:border-foreground/50",
          dim && "opacity-50",
          isEmpty && !active && "opacity-70",
          onFire && "ring-1 ring-destructive ring-offset-2 ring-offset-background",
        )}
      >
        <span
          className={cn(
            "font-mono text-[12px] font-medium tabular-nums leading-none select-none",
            active ? "text-foreground" : isEmpty ? "text-muted-foreground/60" : "text-muted-foreground",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {valueColor ? (
          <span
            className="absolute -bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-background"
            style={{ backgroundColor: valueColor }}
            aria-hidden="true"
          />
        ) : (
          <span
            className="absolute -bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full border border-muted-foreground/40 bg-background ring-2 ring-background"
            aria-hidden="true"
          />
        )}
      </button>
      <div className="absolute -top-1 -right-1 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-no-toggle
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover/node:opacity-100 h-5 w-5 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition"
              aria-label={`Options for stage ${index + 1}`}
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMove(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Move back
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(1)}>
              <ChevronRight className="h-4 w-4 mr-2" /> Move forward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertAfter}>
              <Plus className="h-4 w-4 mr-2" /> Insert after
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleOnFire}>
              <Flame className="h-4 w-4 mr-2" />
              {stage.onFire ? "Unmark money on fire" : "Mark money on fire"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}