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

// Isometric projection. Inputs are 1..5 along each axis; we map to 0..4.
const TILE_X = 70;
const TILE_Y = 36;
const DEPTH = 56;
const ORIGIN: Pt = { x: 470, y: 470 };

function project(impact: number, urgency: number, effort: number): Pt {
  const i = impact - 1;
  const u = urgency - 1;
  const e = effort - 1;
  return {
    x: ORIGIN.x + (i - u) * TILE_X,
    y: ORIGIN.y + (i + u) * TILE_Y - e * DEPTH,
  };
}

// Inverse for the planar (impact, urgency) drag. We hold effort fixed.
function unproject(p: Pt, effort: number): { impact: number; urgency: number } {
  const dx = p.x - ORIGIN.x;
  const dy = p.y - ORIGIN.y + (effort - 1) * DEPTH;
  const i = dy / (2 * TILE_Y) + dx / (2 * TILE_X);
  const u = dy / (2 * TILE_Y) - dx / (2 * TILE_X);
  return { impact: i + 1, urgency: u + 1 };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Plotted = {
  line: Line;
  stage: Stage;
  pt: Pt;
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
        let pt = project(imp, urg, eff);
        // Deterministic jitter to avoid full overlap.
        const h = hash(l.id);
        pt = { x: pt.x + ((h % 9) - 4), y: pt.y + (((h >> 4) % 9) - 4) };
        out.push({ line: l, stage: s, pt, color });
      }
    }
    // Painter's algorithm: back-to-front (lower y first).
    out.sort((a, b) => a.pt.y - b.pt.y);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.stages, doc.lines, doc.valueTags, stageFilter, valueFilter]);

  // Drag state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{
    stageId: string;
    lineId: string;
    effort: number;
    shift: boolean;
    startY: number;
    startEffort: number;
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
      if (drag.shift || e.shiftKey) {
        // Vertical drag → effort
        const dy = drag.startY - e.clientY;
        const nextEffort = drag.startEffort + dy / 50;
        j.setLineScores(drag.stageId, drag.lineId, { effort: nextEffort });
      } else {
        const { impact, urgency } = unproject(p, drag.effort);
        j.setLineScores(drag.stageId, drag.lineId, {
          impact,
          urgency,
        });
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
              pt: project(l.impact ?? 3, l.urgency ?? 3, l.effort ?? 3),
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
            viewBox="0 0 940 720"
            className="w-full h-auto block select-none touch-none"
          >
            <defs>
              <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="hsl(var(--secondary))" stopOpacity="0.4" />
                <stop offset="1" stopColor="hsl(var(--secondary))" stopOpacity="0.1" />
              </linearGradient>
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
              </filter>
            </defs>

            <IsoFloor />
            <AxisLabels />

            {/* Effort pillars */}
            {dots.map((d) => {
              const base = project(d.line.impact ?? 3, d.line.urgency ?? 3, 1);
              return (
                <line
                  key={`pillar-${d.line.id}`}
                  x1={d.pt.x}
                  y1={d.pt.y}
                  x2={base.x}
                  y2={base.y}
                  stroke={HEX[d.color]}
                  strokeOpacity="0.25"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
              );
            })}

            {/* Floor markers under each dot */}
            {dots.map((d) => {
              const base = project(d.line.impact ?? 3, d.line.urgency ?? 3, 1);
              return (
                <ellipse
                  key={`shadow-${d.line.id}`}
                  cx={base.x}
                  cy={base.y}
                  rx={6}
                  ry={3}
                  fill="#000"
                  opacity="0.12"
                />
              );
            })}

            {/* Dots */}
            {dots.map((d) => {
              const isOnFire = !!d.stage.onFire;
              const isSel = selectedId === d.line.id;
              const isHov = hoverId === d.line.id;
              const r =
                6 + ((d.line.impact ?? 3) + (d.line.urgency ?? 3) - 2) * 0.9;
              return (
                <g
                  key={d.line.id}
                  transform={`translate(${d.pt.x} ${d.pt.y})`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                    setSelectedId(d.line.id);
                    setDrag({
                      stageId: d.stage.id,
                      lineId: d.line.id,
                      effort: d.line.effort ?? 3,
                      shift: e.shiftKey,
                      startY: e.clientY,
                      startEffort: d.line.effort ?? 3,
                    });
                  }}
                  onPointerEnter={() => setHoverId(d.line.id)}
                  onPointerLeave={() => setHoverId((h) => (h === d.line.id ? null : h))}
                >
                  <circle
                    r={r + 4}
                    fill={HEX[d.color]}
                    opacity={isSel || isHov ? 0.25 : 0}
                  />
                  {isOnFire && (
                    <circle
                      r={r + 2}
                      fill="none"
                      stroke="hsl(var(--destructive))"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    r={r}
                    fill={HEX[d.color]}
                    stroke="#fff"
                    strokeWidth="1.5"
                    filter="url(#dotShadow)"
                  />
                  {(isSel || isHov) && (
                    <text
                      x={r + 6}
                      y={-r - 4}
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
                x="470"
                y="380"
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="14"
              >
                No gap lines match the current filters.
              </text>
            )}
          </svg>

          <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Priority Quadrant · Impact × Urgency × Effort
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground">
            Drag dots to reposition · Hold <kbd className="px-1 rounded border border-border bg-secondary">Shift</kbd> to adjust Effort
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

// ---------- Iso floor + axis labels ----------

function IsoFloor() {
  // 5×5 grid of tiles; draw lines at impact = 1..5 and urgency = 1..5.
  const lines: ReactElement[] = [];
  for (let i = 1; i <= 5; i++) {
    const a = project(i, 1, 1);
    const b = project(i, 5, 1);
    lines.push(
      <line
        key={`iL${i}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="hsl(var(--border))"
        strokeOpacity={i === 1 || i === 5 ? 0.9 : 0.45}
        strokeWidth={i === 1 || i === 5 ? 1.2 : 1}
      />,
    );
  }
  for (let u = 1; u <= 5; u++) {
    const a = project(1, u, 1);
    const b = project(5, u, 1);
    lines.push(
      <line
        key={`uL${u}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="hsl(var(--border))"
        strokeOpacity={u === 1 || u === 5 ? 0.9 : 0.45}
        strokeWidth={u === 1 || u === 5 ? 1.2 : 1}
      />,
    );
  }
  // Diamond fill
  const c1 = project(1, 1, 1);
  const c2 = project(5, 1, 1);
  const c3 = project(5, 5, 1);
  const c4 = project(1, 5, 1);
  // Effort top diamond (e=5) — faint outline to suggest depth.
  const t1 = project(1, 1, 5);
  const t2 = project(5, 1, 5);
  const t3 = project(5, 5, 5);
  const t4 = project(1, 5, 5);
  return (
    <g>
      <polygon
        points={`${c1.x},${c1.y} ${c2.x},${c2.y} ${c3.x},${c3.y} ${c4.x},${c4.y}`}
        fill="url(#floor)"
      />
      {lines}
      {/* Vertical edges at the four corners */}
      {[c1, c2, c3, c4].map((c, idx) => {
        const t = [t1, t2, t3, t4][idx];
        return (
          <line
            key={`v${idx}`}
            x1={c.x}
            y1={c.y}
            x2={t.x}
            y2={t.y}
            stroke="hsl(var(--border))"
            strokeOpacity="0.4"
            strokeDasharray="3 4"
          />
        );
      })}
      {/* Top outline of the effort cube */}
      <polygon
        points={`${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y} ${t4.x},${t4.y}`}
        fill="none"
        stroke="hsl(var(--border))"
        strokeOpacity="0.35"
        strokeDasharray="3 4"
      />
    </g>
  );
}

function AxisLabels() {
  const impactLow = project(1, 5, 1);
  const impactHigh = project(5, 5, 1);
  const urgencyLow = project(5, 1, 1);
  const urgencyHigh = project(5, 5, 1);
  const effortTop = project(5, 1, 5);
  return (
    <g className="fill-muted-foreground" fontSize="11" fontWeight="600">
      {/* Impact axis along the front-left edge */}
      <text x={impactLow.x - 8} y={impactLow.y + 24} textAnchor="end">
        Low Impact
      </text>
      <text x={impactHigh.x + 8} y={impactHigh.y + 24}>
        High Impact →
      </text>
      {/* Urgency axis along the front-right edge */}
      <text x={urgencyLow.x + 8} y={urgencyLow.y + 6}>
        Low Urgency
      </text>
      <text x={urgencyHigh.x + 8} y={urgencyHigh.y + 18}>
        High Urgency →
      </text>
      {/* Effort axis (vertical) */}
      <text x={effortTop.x + 10} y={effortTop.y - 4}>
        ↑ High Effort
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
        Dot color = stage value tag
      </div>
      <div>Larger dot = higher impact + urgency</div>
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-destructive" />
        Red ring = stage is "Money on fire"
      </div>
      <div>Height of dot above floor = Effort</div>
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
      Click a dot to inspect it, or drag dots around the cube to re-prioritize.
      Hold <kbd className="px-1 rounded border border-border bg-background">Shift</kbd> while
      dragging vertically to change Effort.
    </div>
  );
}