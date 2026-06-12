import { ChevronLeft, ChevronRight, Flame, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Stage, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  stages: Stage[];
  valueTags: Tag[];
  selectedStageId: string | null;
  showMoneyOnFire: boolean;
  onSelect: (id: string) => void;
  // accepted for API parity with JourneyMap, unused on the ring itself
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
  const nodeSize = 90; // emoji disc only — much smaller now
  // Leave extra room around the ring for radial labels
  const ringRadius = VB / 2 - 170;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i: number) => ({
    x: cx + ringRadius * Math.cos(angleFor(i)),
    y: cy + ringRadius * Math.sin(angleFor(i)),
  });

  const selectedIndex = selectedStageId
    ? stages.findIndex((s) => s.id === selectedStageId)
    : -1;

  const nodeAngularRadius = Math.min(
    Math.PI / n - 0.05,
    Math.asin(Math.min(0.99, nodeSize / 2 / ringRadius)) + 0.06,
  );

  const arcs = stages.map((_, i) => {
    const a1 = angleFor(i) + nodeAngularRadius;
    const a2 = angleFor((i + 1) % n) - nodeAngularRadius;
    const start = { x: cx + ringRadius * Math.cos(a1), y: cy + ringRadius * Math.sin(a1) };
    const end = { x: cx + ringRadius * Math.cos(a2), y: cy + ringRadius * Math.sin(a2) };
    const am = (a1 + a2) / 2;
    const mid = { x: cx + ringRadius * Math.cos(am), y: cy + ringRadius * Math.sin(am) };
    const tx = -Math.sin(am);
    const ty = Math.cos(am);
    const toIndex = (i + 1) % n;
    return { start, end, mid, tx, ty, toIndex };
  });

  // Label radial placement: place block outside the ring at the node's angle
  const labelOffset = nodeSize / 2 + 14;

  return (
    <div className="mx-auto w-full max-w-[760px] aspect-square relative">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full">
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="3 6"
          opacity={0.5}
        />
        {arcs.map((a, i) => {
          const isActiveInbound = a.toIndex === selectedIndex;
          const stroke = isActiveInbound
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground))";
          const opacity = isActiveInbound ? 1 : 0.45;
          const arrowSize = 14;
          return (
            <g key={i}>
              <path
                d={`M ${a.start.x} ${a.start.y} A ${ringRadius} ${ringRadius} 0 0 1 ${a.end.x} ${a.end.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={2.5}
                opacity={opacity}
              />
              <polygon
                points={(() => {
                  const s = arrowSize;
                  const p1 = { x: a.mid.x + a.tx * s, y: a.mid.y + a.ty * s };
                  const p2 = {
                    x: a.mid.x - a.tx * s * 0.5 + a.ty * s * 0.7,
                    y: a.mid.y - a.ty * s * 0.5 - a.tx * s * 0.7,
                  };
                  const p3 = {
                    x: a.mid.x - a.tx * s * 0.5 - a.ty * s * 0.7,
                    y: a.mid.y - a.ty * s * 0.5 + a.tx * s * 0.7,
                  };
                  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
                })()}
                fill={stroke}
                opacity={opacity}
              />
              {/* numbered badge near arrow, nudged toward center */}
              <g
                transform={`translate(${a.mid.x - a.tx * 32 + (cx - a.mid.x) * 0.07}, ${
                  a.mid.y - a.ty * 32 + (cy - a.mid.y) * 0.07
                })`}
              >
                <circle r={16} fill="hsl(var(--background))" stroke={stroke} strokeWidth={1.5} opacity={isActiveInbound ? 1 : 0.85} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={15}
                  fontWeight={600}
                  fill={stroke}
                >
                  {a.toIndex + 1}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Start marker outside the ring at 12 o'clock */}
      <div
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          left: "50%",
          top: `${((cy - ringRadius - nodeSize / 2 - 70) / VB) * 100}%`,
          transform: "translate(-50%, 0)",
        }}
      >
        <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm">
          Start here
        </span>
        <svg width="14" height="22" viewBox="0 0 14 22" className="text-primary mt-0.5">
          <path d="M7 0 V18 M2 13 L7 20 L12 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {stages.map((s, i) => {
        const p = pointFor(i);
        const angle = angleFor(i);
        const left = `${(p.x / VB) * 100}%`;
        const top = `${(p.y / VB) * 100}%`;
        const sizePct = (nodeSize / VB) * 100;
        const active = s.id === selectedStageId;
        const dim = selectedStageId && !active;
        const onFire = showMoneyOnFire && !!s.onFire;
        const valueTag = valueTags.find((t) => t.id === s.valueTagId);

        // Label position: radially outward from node center
        const labelDx = Math.cos(angle) * labelOffset;
        const labelDy = Math.sin(angle) * labelOffset;
        // Choose label alignment based on quadrant
        const isTop = labelDy < -10;
        const isBottom = labelDy > 10;
        const isLeft = labelDx < -10;
        const isRight = labelDx > 10;
        const align = isLeft ? "items-end text-right" : isRight ? "items-start text-left" : "items-center text-center";
        const translate = `translate(${isLeft ? "-100%" : isRight ? "0" : "-50%"}, ${isTop ? "-100%" : isBottom ? "0" : "-50%"})`;

        return (
          <div key={s.id}>
            {/* Node disc */}
            <div
              className="absolute"
              style={{
                left,
                top,
                width: `${sizePct}%`,
                height: `${sizePct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <StageNode
                stage={s}
                active={active}
                dim={!!dim}
                onFire={onFire}
                onSelect={() => onSelect(s.id)}
                onToggleOnFire={() => onToggleOnFire(s.id)}
                onMove={(dir) => onMove(s.id, dir)}
                onInsertAfter={() => onInsertAfter(i)}
                onDelete={() => onDelete(s)}
              />
            </div>
            {/* External label */}
            <div
              className={cn(
                "absolute pointer-events-none flex flex-col gap-0.5 max-w-[150px]",
                align,
                dim && "opacity-55",
              )}
              style={{
                left: `${((p.x + labelDx) / VB) * 100}%`,
                top: `${((p.y + labelDy) / VB) * 100}%`,
                transform: translate,
              }}
            >
              <span
                className={cn(
                  "text-[10px] font-display font-semibold tracking-tight leading-none",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "text-[12.5px] font-medium leading-tight text-foreground",
                  active && "text-foreground",
                )}
              >
                {s.title}
              </span>
              {valueTag && (
                <span
                  className="inline-flex items-center self-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
                  style={{
                    backgroundColor: `${valueTag.color}22`,
                    color: valueTag.color,
                  }}
                >
                  {valueTag.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type NodeProps = {
  stage: Stage;
  active: boolean;
  dim: boolean;
  onFire: boolean;
  onSelect: () => void;
  onToggleOnFire: () => void;
  onMove: (dir: -1 | 1) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
};

function StageNode({
  stage,
  active,
  dim,
  onFire,
  onSelect,
  onToggleOnFire,
  onMove,
  onInsertAfter,
  onDelete,
}: NodeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-no-toggle]")) return;
            onSelect();
          }}
          className={cn(
            "group/node absolute inset-0 flex items-center justify-center rounded-full border-2 bg-card text-3xl cursor-pointer transition-all",
            active
              ? "border-primary scale-110 shadow-md"
              : "border-border hover:border-foreground/30 hover:scale-105",
            dim && "opacity-55",
            onFire && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
          )}
          style={{ boxShadow: active ? "var(--shadow-card)" : undefined }}
        >
          <span className="leading-none select-none">{stage.emoji}</span>
          <div className="absolute -top-1 -right-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-no-toggle
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover/node:opacity-100 h-6 w-6 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                  aria-label="Stage options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
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
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px]">
        <div className="font-medium">{stage.title}</div>
        {stage.subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5">{stage.subtitle}</div>
        )}
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          Click to open
        </div>
      </TooltipContent>
    </Tooltip>
  );
}