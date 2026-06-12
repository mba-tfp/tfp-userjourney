import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { LineRow } from "./LineRow";
import type { Line, Tag } from "@/lib/journey-data";
import { cn } from "@/lib/utils";
import { TAG_PILL } from "./tag-colors";

const UNTAGGED = "__untagged__";

type Props = {
  title: string;
  subtitle?: string;
  accent?: "default" | "destructive";
  lines: Line[];
  tags: Tag[];
  onAddLine: () => void;
  onUpdateLine: (id: string, patch: Partial<Line>) => void;
  onDeleteLine: (id: string) => void;
  onMoveLine: (id: string, dir: -1 | 1) => void;
  onManageTags: () => void;
};

export function LineListCard({
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
}: Props) {
  const isGap = accent === "destructive";
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Count lines per tag (within this card only)
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) {
      const key = l.tagId ?? UNTAGGED;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [lines]);

  // Legend in stable tag-registry order, then untagged at the end
  const legend = useMemo(() => {
    const items: { key: string; name: string; color: string; count: number }[] = [];
    for (const t of tags) {
      const c = counts.get(t.id);
      if (c) items.push({ key: t.id, name: t.name, color: t.color, count: c });
    }
    const untagged = counts.get(UNTAGGED);
    if (untagged) items.push({ key: UNTAGGED, name: "Untagged", color: "slate", count: untagged });
    return items;
  }, [counts, tags]);

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = activeFilters.size
    ? lines.filter((l) => activeFilters.has(l.tagId ?? UNTAGGED))
    : lines;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-6 transition-shadow flex flex-col",
        isGap ? "border-destructive/25" : "border-border",
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
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
          {filtered.length}
          {activeFilters.size > 0 && lines.length !== filtered.length && (
            <span className="text-muted-foreground/60"> / {lines.length}</span>
          )}
        </span>
      </header>

      {legend.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {legend.map((l) => {
            const active = activeFilters.has(l.key);
            const pill = TAG_PILL[l.color as keyof typeof TAG_PILL] ?? TAG_PILL.slate;
            return (
              <button
                key={l.key}
                onClick={() => toggleFilter(l.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition",
                  pill,
                  active
                    ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background"
                    : "opacity-80 hover:opacity-100",
                )}
                title={active ? `Stop filtering by ${l.name}` : `Filter by ${l.name}`}
              >
                <span>{l.name}</span>
                <span className="rounded-full bg-background/60 px-1 text-[10px] font-bold tabular-nums">
                  {l.count}
                </span>
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="ml-1 text-[10.5px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 flex-1">
        {filtered.map((line) => (
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
        {filtered.length === 0 && (
          <p className="text-[12.5px] italic text-muted-foreground py-2">
            {lines.length === 0 ? "Nothing here yet." : "No lines match the active filters."}
          </p>
        )}
      </div>
      <button
        onClick={onAddLine}
        className="mt-3 inline-flex items-center gap-1 self-start text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
      >
        <Plus className="h-3 w-3" /> Add line
      </button>
    </article>
  );
}