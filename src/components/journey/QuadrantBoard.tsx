import { useMemo, useRef, useState, useEffect, type ReactElement } from "react";
import { useJourney } from "@/lib/journey-store";
import type { Line, Stage, Tag, TagColor } from "@/lib/journey-data";
import { TAG_PILL } from "./tag-colors";
import { cn } from "@/lib/utils";
import { Flame, X } from "lucide-react";

// Hex equivalents of the Tailwind tag dot palette (Tailwind 500 shades).
const HEX: Record<TagColor, string> = {
  slate: "#64748b",
  blue: "#3b82f6",
  teal: "#14b8a6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  emerald: "#10b981",
  fuchsia: "#d946ef",
};

type Pt = { x: number; y: number };

// 2D board. X = Effort (1..5). Dual Y axes on the same 0–100 scale:
// left axis = Urgency, right axis = Impact. Each item is rendered as
// a vertical segment from its urgency point (left-side marker) to its
// impact point (right-side marker) at x = effort.
const VIEW_W = 940;
const VIEW_H = 640;
const PAD_L = 70;
const PAD_R = 70;
const PAD_T = 40;
const PAD_B = 60;
const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

// Map a 1..5 score to a pixel coordinate along an axis.
function xForEffort(effort: number) {
  const e = Math.max(1, Math.min(5, effort));
  return PAD_L + ((e - 1) / 4) * PLOT_W;
}
function yForScore(score: number) {
  const s = Math.max(1, Math.min(5, score));
  return PAD_T + ((5 - s) / 4) * PLOT_H;
}
function effortFromX(x: number) {
  return 1 + ((x - PAD_L) / PLOT_W) * 4;
}
function scoreFromY(y: number) {
  return 5 - ((y - PAD_T) / PLOT_H) * 4;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Plotted = {
  line: Line;
  stage: Stage;
  x: number;
  yImpact: number;
  yUrgency: number;
  jitter: number;
  color: TagColor;
};

export function QuadrantBoard() {
  const j = useJourney();
  const { doc } = j;

  const stageById = useMemo(
    () => new Map(doc.stages.map((s) => [s.id, s])),
    [doc.stages],
  );
  const valueTagById = useMemo(
    () => new Map(doc.valueTags.map((t) => [t.id, t])),
    [doc.valueTags],
  );

  // Filters
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [valueFilter, setValueFilter] = useState<Set<string>>(new Set());
  const stageActive = (id: string) =>
    stageFilter.size === 0 || stageFilter.has(id);
  const valueActive = (s: Stage) =>
    valueFilter.size === 0 || s.valueTagIds.some((id) => valueFilter.has(id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Build all gap-line dots.
  const dots: Plotted[] = useMemo(() => {
    const out: Plotted[] = [];
    for (const s of doc.stages) {
      if (!stageActive(s.id) || !valueActive(s)) continue;
      const lines = doc.lines[s.id] ?? [];
      const valueTag = s.valueTagIds[0] ? valueTagById.get(s.valueTagIds[0]) : null;
      const color = (valueTag?.color as TagColor) ?? "slate";
      for (const l of lines) {
        if (l.exists) continue;
        const imp = l.impact ?? 3;
        const urg = l.urgency ?? 3;
        const eff = l.effort ?? 3;
        // Deterministic horizontal jitter so items at the same effort don't fully overlap.
        const h = hash(l.id);
        const jitter = ((h % 21) - 10); // -10..+10 px
        out.push({
          line: l,
          stage: s,
          x: xForEffort(eff) + jitter,
          yImpact: yForScore(imp),
          yUrgency: yForScore(urg),
          jitter,
          color,
        });
      }
    }
    // Longer segments (bigger gap between urgency & impact) painted first so short ones land on top.
    out.sort(
      (a, b) =>
        Math.abs(b.yImpact - b.yUrgency) - Math.abs(a.yImpact - a.yUrgency),
    );
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.stages, doc.lines, doc.valueTags, stageFilter, valueFilter]);

  // Drag state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{
    stageId: string;
    lineId: string;
    mode: "impact" | "urgency" | "effort";
  } | null>(null);

  const toSvgPt = (evt: { clientX: number; clientY: number }): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const p = toSvgPt(e);
      if (!p) return;
      const effort = effortFromX(p.x);
      if (drag.mode === "impact") {
        j.setLineScores(drag.stageId, drag.lineId, {
          effort,
          impact: scoreFromY(p.y),
        });
      } else if (drag.mode === "urgency") {
        j.setLineScores(drag.stageId, drag.lineId, {
          effort,
          urgency: scoreFromY(p.y),
        });
      } else {
        j.setLineScores(drag.stageId, drag.lineId, { effort });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, j]);

  const selected = selectedId
    ? dots.find((d) => d.line.id === selectedId) ??
      // Find even if filtered out
      (() => {
        for (const s of doc.stages) {
          const l = (doc.lines[s.id] ?? []).find((x) => x.id === selectedId);
          if (l) {
            const valueTag = s.valueTagIds[0]
              ? valueTagById.get(s.valueTagIds[0])
              : null;
            return {
              line: l,
              stage: s,
              x: xForEffort(l.effort ?? 3),
              yImpact: yForScore(l.impact ?? 3),
              yUrgency: yForScore(l.urgency ?? 3),
              jitter: 0,
              color: (valueTag?.color as TagColor) ?? "slate",
            };
          }
        }
        return null;
      })()
    : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters */}
      <aside className="lg:w-56 shrink-0 space-y-5">
        <FilterGroup
          label="Stages"
          options={doc.stages.map((s) => ({
            id: s.id,
            label: `${s.emoji} ${s.title}`,
          }))}
          selected={stageFilter}
          onToggle={(id) =>
            setStageFilter((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onClear={() => setStageFilter(new Set())}
        />
        <FilterGroup
          label="Value"
          options={doc.valueTags.map((t) => ({
            id: t.id,
            label: t.name,
            color: t.color as TagColor,
          }))}
          selected={valueFilter}
          onToggle={(id) =>
            setValueFilter((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onClear={() => setValueFilter(new Set())}
        />
        <Legend />
      </aside>

      {/* Board */}
      <div className="flex-1 min-w-0">
        <div className="relative rounded-xl border border-border bg-gradient-to-b from-secondary/30 to-background overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-auto block select-none touch-none"
          >
            <defs>
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
              </filter>
            </defs>

            <Grid />
            <AxisLabels />

            {/* Segments: urgency (left marker) ↔ impact (right marker) at x = effort */}
            {dots.map((d) => {
              const isOnFire = !!d.stage.onFire;
              const isSel = selectedId === d.line.id;
              const isHov = hoverId === d.line.id;
              const r = 7;
              const color = HEX[d.color];
              const labelY = Math.min(d.yImpact, d.yUrgency) - 10;
              return (
                <g
                  key={d.line.id}
                  onPointerEnter={() => setHoverId(d.line.id)}
                  onPointerLeave={() => setHoverId((h) => (h === d.line.id ? null : h))}
                >
                  {/* Connecting segment — drag to change Effort only */}
                  <line
                    x1={d.x}
                    y1={d.yUrgency}
                    x2={d.x}
                    y2={d.yImpact}
                    stroke={color}
                    strokeOpacity={isSel || isHov ? 0.9 : 0.45}
                    strokeWidth={isSel ? 3 : 2}
                    strokeLinecap="round"
                    className="cursor-ew-resize"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setSelectedId(d.line.id);
                      setDrag({ stageId: d.stage.id, lineId: d.line.id, mode: "effort" });
                    }}
                  />
                  {/* Urgency marker (left-axis side) — hollow */}
                  <circle
                    cx={d.x}
                    cy={d.yUrgency}
                    r={r}
                    fill="hsl(var(--background))"
                    stroke={color}
                    strokeWidth="2"
                    className="cursor-grab active:cursor-grabbing"
                    filter="url(#dotShadow)"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setSelectedId(d.line.id);
                      setDrag({ stageId: d.stage.id, lineId: d.line.id, mode: "urgency" });
                    }}
                  />
                  {/* Impact marker (right-axis side) — filled */}
                  <circle
                    cx={d.x}
                    cy={d.yImpact}
                    r={r}
                    fill={color}
                    fillOpacity="0.9"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className="cursor-grab active:cursor-grabbing"
                    filter="url(#dotShadow)"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setSelectedId(d.line.id);
                      setDrag({ stageId: d.stage.id, lineId: d.line.id, mode: "impact" });
                    }}
                  />
                  {isOnFire && (
                    <circle
                      cx={d.x}
                      cy={d.yImpact}
                      r={r + 3}
                      fill="none"
                      stroke="hsl(var(--destructive))"
                      strokeWidth="1.5"
                    />
                  )}
                  {(isSel || isHov) && (
                    <text
                      x={d.x + r + 6}
                      y={labelY + 4}
                      className="fill-foreground"
                      fontSize="11"
                      fontWeight="600"
                      style={{ pointerEvents: "none" }}
                    >
                      {truncate(d.line.text || "Untitled", 36)}
                    </text>
                  )}
                </g>
              );
            })}

            {dots.length === 0 && (
              <text
                x={VIEW_W / 2}
                y={VIEW_H / 2}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="14"
              >
                No gap lines match the current filters.
              </text>
            )}
          </svg>

          <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Priority Plot · Urgency (○) ↔ Impact (●) · X = Effort
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground">
            Drag markers to set scores · Drag segment to shift Effort
          </div>
        </div>
      </div>

      {/* Side panel */}
      <aside className="lg:w-80 shrink-0">
        {selected ? (
          <DetailPanel
            stage={selected.stage}
            line={selected.line}
            tags={doc.tags}
            color={selected.color}
            onClose={() => setSelectedId(null)}
            onScore={(patch) =>
              j.setLineScores(selected.stage.id, selected.line.id, patch)
            }
            onText={(text) => j.updateLine(selected.stage.id, selected.line.id, { text })}
            onToggleExists={() =>
              j.updateLine(selected.stage.id, selected.line.id, {
                exists: !selected.line.exists,
              })
            }
          />
        ) : (
          <EmptyPanel total={dots.length} />
        )}
      </aside>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---------- 2D grid, quadrant labels, axis labels ----------

function Grid() {
  const lines: ReactElement[] = [];
  const STEPS = 10;
  for (let i = 0; i <= STEPS; i++) {
    const x = PAD_L + (i / STEPS) * PLOT_W;
    const y = PAD_T + (i / STEPS) * PLOT_H;
    const edge = i === 0 || i === STEPS;
    const mid = i === STEPS / 2;
    lines.push(
      <line
        key={`v${i}`}
        x1={x}
        y1={PAD_T}
        x2={x}
        y2={PAD_T + PLOT_H}
        stroke="hsl(var(--border))"
        strokeOpacity={edge ? 0.9 : mid ? 0.45 : 0.2}
      />,
      <line
        key={`h${i}`}
        x1={PAD_L}
        y1={y}
        x2={PAD_L + PLOT_W}
        y2={y}
        stroke="hsl(var(--border))"
        strokeOpacity={edge ? 0.9 : mid ? 0.45 : 0.2}
      />,
    );
  }
  return <g>{lines}</g>;
}

function AxisLabels() {
  const midY = PAD_T + PLOT_H / 2;
  return (
    <g className="fill-muted-foreground" fontSize="11" fontWeight="600">
      {/* Left axis: Urgency */}
      <text
        x={PAD_L - 14}
        y={midY}
        textAnchor="middle"
        transform={`rotate(-90 ${PAD_L - 14} ${midY})`}
        className="uppercase tracking-[0.18em]"
      >
        Urgency →
      </text>
      <text x={PAD_L - 10} y={PAD_T + 4} textAnchor="end" fontSize="10">
        High
      </text>
      <text x={PAD_L - 10} y={PAD_T + PLOT_H} textAnchor="end" fontSize="10">
        Low
      </text>
      {/* Right axis: Impact */}
      <text
        x={PAD_L + PLOT_W + 14}
        y={midY}
        textAnchor="middle"
        transform={`rotate(90 ${PAD_L + PLOT_W + 14} ${midY})`}
        className="uppercase tracking-[0.18em]"
      >
        Impact →
      </text>
      <text x={PAD_L + PLOT_W + 10} y={PAD_T + 4} fontSize="10">
        High
      </text>
      <text x={PAD_L + PLOT_W + 10} y={PAD_T + PLOT_H} fontSize="10">
        Low
      </text>
      {/* X axis: Effort */}
      <text
        x={PAD_L + PLOT_W / 2}
        y={VIEW_H - 18}
        textAnchor="middle"
        className="uppercase tracking-[0.18em]"
      >
        Effort →
      </text>
      <text x={PAD_L} y={PAD_T + PLOT_H + 16} fontSize="10">
        Low
      </text>
      <text
        x={PAD_L + PLOT_W}
        y={PAD_T + PLOT_H + 16}
        textAnchor="end"
        fontSize="10"
      >
        High
      </text>
    </g>
  );
}

// ---------- Filter chip group ----------

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { id: string; label: string; color?: TagColor }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {selected.size > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => onToggle(o.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition",
                on
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {o.color && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: HEX[o.color] }}
                />
              )}
              <span className="truncate max-w-[140px]">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-muted-foreground space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
        Legend
      </div>
      <div>
        <span className="inline-block h-2 w-2 rounded-full align-middle bg-foreground mr-1.5" />
        Color = stage value tag
      </div>
      <div>
        <span className="inline-block h-2 w-2 rounded-full align-middle border border-foreground mr-1.5" />
        Hollow = Urgency (left axis)
      </div>
      <div>
        <span className="inline-block h-2 w-2 rounded-full align-middle bg-foreground mr-1.5" />
        Filled = Impact (right axis)
      </div>
      <div>X position = Effort (low → high)</div>
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-destructive" />
        Red ring = stage is "Money on fire"
      </div>
    </div>
  );
}

// ---------- Detail panel ----------

function DetailPanel({
  stage,
  line,
  tags,
  color,
  onClose,
  onScore,
  onText,
  onToggleExists,
}: {
  stage: Stage;
  line: Line;
  tags: Tag[];
  color: TagColor;
  onClose: () => void;
  onScore: (patch: { impact?: number; urgency?: number; effort?: number }) => void;
  onText: (text: string) => void;
  onToggleExists: () => void;
}) {
  const lineTags = line.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sticky top-24">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {stage.emoji} {stage.title}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: HEX[color] }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {line.exists ? "Exists" : "Gap"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={line.text}
        onChange={(e) => onText(e.target.value)}
        className="mt-3 w-full resize-none rounded-md border border-border bg-background p-2 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-primary/40"
        rows={3}
        placeholder="Describe this gap…"
      />

      {lineTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lineTags.map((t) => (
            <span
              key={t.id}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                TAG_PILL[t.color as TagColor],
              )}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <Slider
          label="Impact"
          value={line.impact ?? 3}
          onChange={(v) => onScore({ impact: v })}
          accent="bg-blue-500"
        />
        <Slider
          label="Urgency"
          value={line.urgency ?? 3}
          onChange={(v) => onScore({ urgency: v })}
          accent="bg-rose-500"
        />
        <Slider
          label="Effort"
          value={line.effort ?? 3}
          onChange={(v) => onScore({ effort: v })}
          accent="bg-amber-500"
        />
      </div>

      <button
        onClick={onToggleExists}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      >
        Mark as {line.exists ? "gap" : "existing"}
      </button>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value}/5</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "h-2 flex-1 rounded-full transition",
              n <= value ? accent : "bg-secondary hover:bg-secondary/70",
            )}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyPanel({ total }: { total: number }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-xs text-muted-foreground sticky top-24">
      <div className="text-sm font-semibold text-foreground mb-1">
        {total} gap{total === 1 ? "" : "s"} plotted
      </div>
      Click a bubble to inspect it, or drag bubbles around the grid to
      re-prioritize. Effort lives in the side panel.
    </div>
  );
}