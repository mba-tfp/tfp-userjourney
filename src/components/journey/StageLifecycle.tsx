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
  onSelect: (id: string) => void;
  onRename?: (id: string, patch: Partial<Stage>) => void;
  onValueChange?: (id: string, valueTagId: string | undefined) => void;
  onManageValueTags?: () => void;
  onToggleOnFire: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onInsertAfter: (index: number) => void;
  onDelete: (stage: Stage) => void;
};

export function StageLifecycle({
  stages,
  valueTags,
  selectedStageId,
  showMoneyOnFire,
  onSelect,
  onToggleOnFire,
  onMove,
  onInsertAfter,
  onDelete,
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

  return (
    <div className="mx-auto w-full max-w-[680px] aspect-square relative">
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

      {/* Center summary */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center max-w-[58%]">
          {selected ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
                  STAGE {String(selectedIndex + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </span>
                {selectedValueTag && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: selectedValueTag.color }}
                    />
                    {selectedValueTag.name}
                  </span>
                )}
              </div>
              <h3 className="font-display text-2xl leading-tight tracking-tight text-foreground">
                {selected.title}
              </h3>
              {selected.subtitle && (
                <p className="mt-2 text-sm text-muted-foreground leading-snug">
                  {selected.subtitle}
                </p>
              )}
            </>
          ) : (
            <>
              <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
                {n} STAGES
              </span>
              <h3 className="mt-2 font-display text-xl leading-tight tracking-tight text-foreground">
                Select a stage
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Click any point on the ring to open it
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
                "absolute pointer-events-none flex flex-col gap-0.5 max-w-[140px]",
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
  valueColor,
  onSelect,
  onToggleOnFire,
  onMove,
  onInsertAfter,
  onDelete,
}: NodeProps) {
  return (
    <div
      role="button"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-toggle]")) return;
        onSelect();
      }}
      className={cn(
        "group/node absolute inset-0 flex items-center justify-center rounded-full border bg-background cursor-pointer transition-all",
        active
          ? "border-foreground scale-110 shadow-sm"
          : "border-border hover:border-foreground/50",
        dim && "opacity-50",
        onFire && "ring-1 ring-destructive ring-offset-2 ring-offset-background",
      )}
    >
      <span
        className={cn(
          "font-mono text-[12px] font-medium tabular-nums leading-none select-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      {valueColor && (
        <span
          className="absolute -bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-background"
          style={{ backgroundColor: valueColor }}
        />
      )}
      <div className="absolute -top-1 -right-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-no-toggle
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover/node:opacity-100 h-5 w-5 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition"
              aria-label="Stage options"
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