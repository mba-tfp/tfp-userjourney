import { ChevronLeft, ChevronRight, Flame, MoreVertical, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditableText } from "./EditableText";
import { TagPicker } from "./TagPicker";
import type { Stage, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

type Props = {
  stages: Stage[];
  valueTags: Tag[];
  selectedStageId: string | null;
  showMoneyOnFire: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, patch: Partial<Stage>) => void;
  onValueChange: (id: string, valueTagId: string | undefined) => void;
  onToggleOnFire: (id: string) => void;
  onManageValueTags: () => void;
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
  onRename,
  onValueChange,
  onToggleOnFire,
  onManageValueTags,
  onMove,
  onInsertAfter,
  onDelete,
}: Props) {
  const n = stages.length;
  if (n === 0) return null;

  // SVG viewBox space
  const VB = 1000;
  const cx = VB / 2;
  const cy = VB / 2;
  // Node size in viewBox units — shrink as stages grow
  const nodeSize = Math.max(110, Math.min(170, Math.round(((2 * Math.PI) / n) * 220)));
  const ringRadius = VB / 2 - nodeSize / 2 - 24;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i: number) => ({
    x: cx + ringRadius * Math.cos(angleFor(i)),
    y: cy + ringRadius * Math.sin(angleFor(i)),
  });

  // Arc endpoints stop short of nodes so the arrow doesn't enter them.
  // Gap (in radians) consumed by each node on the ring.
  const nodeAngularRadius = Math.min(
    Math.PI / n - 0.04,
    Math.asin(Math.min(0.99, nodeSize / 2 / ringRadius)) + 0.05,
  );

  const arcs = stages.map((_, i) => {
    const a1 = angleFor(i) + nodeAngularRadius;
    const a2 = angleFor((i + 1) % n) - nodeAngularRadius;
    const start = { x: cx + ringRadius * Math.cos(a1), y: cy + ringRadius * Math.sin(a1) };
    const end = { x: cx + ringRadius * Math.cos(a2), y: cy + ringRadius * Math.sin(a2) };
    // mid-arc point for arrowhead
    const am = (a1 + a2) / 2;
    const mid = { x: cx + ringRadius * Math.cos(am), y: cy + ringRadius * Math.sin(am) };
    // tangent direction (clockwise)
    const tx = -Math.sin(am);
    const ty = Math.cos(am);
    return { start, end, mid, tx, ty };
  });

  return (
    <div className="mx-auto w-full max-w-[640px] aspect-square relative">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full">
        {/* Faint full ring */}
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="3 6"
          opacity={0.6}
        />
        {arcs.map((a, i) => (
          <g key={i}>
            <path
              d={`M ${a.start.x} ${a.start.y} A ${ringRadius} ${ringRadius} 0 0 1 ${a.end.x} ${a.end.y}`}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
            />
            {/* arrowhead at midpoint */}
            <polygon
              points={(() => {
                const size = 10;
                const p1 = { x: a.mid.x + a.tx * size, y: a.mid.y + a.ty * size };
                const p2 = {
                  x: a.mid.x - a.tx * size * 0.5 + a.ty * size * 0.6,
                  y: a.mid.y - a.ty * size * 0.5 - a.tx * size * 0.6,
                };
                const p3 = {
                  x: a.mid.x - a.tx * size * 0.5 - a.ty * size * 0.6,
                  y: a.mid.y - a.ty * size * 0.5 + a.tx * size * 0.6,
                };
                return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
              })()}
              fill="hsl(var(--muted-foreground))"
              opacity={0.55}
            />
          </g>
        ))}
      </svg>

      {stages.map((s, i) => {
        const p = pointFor(i);
        const left = `${(p.x / VB) * 100}%`;
        const top = `${(p.y / VB) * 100}%`;
        const sizePct = (nodeSize / VB) * 100;
        const active = s.id === selectedStageId;
        const dim = selectedStageId && !active;
        const onFire = showMoneyOnFire && !!s.onFire;
        return (
          <div
            key={s.id}
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
              index={i}
              stage={s}
              valueTags={valueTags}
              active={active}
              dim={!!dim}
              onFire={onFire}
              onSelect={() => onSelect(s.id)}
              onRename={(patch) => onRename(s.id, patch)}
              onValueChange={(v) => onValueChange(s.id, v)}
              onToggleOnFire={() => onToggleOnFire(s.id)}
              onManageValueTags={onManageValueTags}
              onMove={(dir) => onMove(s.id, dir)}
              onInsertAfter={() => onInsertAfter(i)}
              onDelete={() => onDelete(s)}
            />
          </div>
        );
      })}
    </div>
  );
}

type NodeProps = {
  index: number;
  stage: Stage;
  valueTags: Tag[];
  active: boolean;
  dim: boolean;
  onFire: boolean;
  onSelect: () => void;
  onRename: (patch: Partial<Stage>) => void;
  onValueChange: (valueTagId: string | undefined) => void;
  onToggleOnFire: () => void;
  onManageValueTags: () => void;
  onMove: (dir: -1 | 1) => void;
  onInsertAfter: () => void;
  onDelete: () => void;
};

function StageNode({
  index,
  stage,
  valueTags,
  active,
  dim,
  onFire,
  onSelect,
  onRename,
  onValueChange,
  onToggleOnFire,
  onManageValueTags,
  onMove,
  onInsertAfter,
  onDelete,
}: NodeProps) {
  return (
    <div
      role="button"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("input, textarea, [data-no-toggle]")) return;
        onSelect();
      }}
      className={cn(
        "group/node absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full border bg-card p-2 text-center cursor-pointer transition-all",
        active
          ? "border-primary/50 scale-105"
          : "border-border hover:border-foreground/20 hover:scale-[1.02]",
        dim && "opacity-55",
        onFire && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
      )}
      style={{ boxShadow: active ? "var(--shadow-card)" : undefined }}
    >
      <div className="absolute top-1.5 left-2 text-[10px] font-display font-semibold tracking-tight text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="absolute top-1 right-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-no-toggle
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover/node:opacity-100 text-muted-foreground hover:text-foreground transition p-1"
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

      <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center text-lg leading-none">
        <EditableText
          value={stage.emoji}
          onChange={(emoji) => onRename({ emoji })}
          className="leading-none"
        />
      </div>
      <div className="w-full px-1 text-[11px] font-medium leading-tight text-foreground line-clamp-2">
        <EditableText value={stage.title} onChange={(title) => onRename({ title })} />
      </div>
      <div data-no-toggle onClick={(e) => e.stopPropagation()} className="scale-[0.78] origin-top">
        <TagPicker
          tags={valueTags}
          value={stage.valueTagId}
          onChange={onValueChange}
          onManage={onManageValueTags}
          placeholder="Set value"
          manageLabel="Manage value tags…"
        />
      </div>
    </div>
  );
}