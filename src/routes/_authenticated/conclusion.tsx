import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Flame } from "lucide-react";
import { useMemo } from "react";
import { useJourney } from "@/lib/journey-store";
import { TAG_DOT, TAG_PILL } from "@/components/journey/tag-colors";
import type { Tag, TagColor } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/conclusion")({
  component: ConclusionPage,
});

function ConclusionPage() {
  const j = useJourney();

  const stats = useMemo(() => {
    if (!j.hydrated) return null;
    let total = 0;
    let gaps = 0;
    let fires = 0;
    const byValue: Record<string, number> = {};
    for (const s of j.doc.stages) {
      if (s.onFire) fires++;
      for (const vt of s.valueTagIds) byValue[vt] = (byValue[vt] ?? 0) + 1;
      const lines = j.doc.lines[s.id] ?? [];
      total += lines.length;
      for (const l of lines) if (!l.exists) gaps++;
    }
    return { total, gaps, fires, byValue };
  }, [j.doc, j.hydrated]);

  if (!j.hydrated || !stats) {
    return (
      <div className="min-h-dvh bg-background px-8 py-10">
        <div className="h-3 w-48 rounded bg-secondary animate-pulse" />
      </div>
    );
  }

  const { doc } = j;
  const valueTagById = new Map(doc.valueTags.map((v) => [v.id, v]));
  const tagById = new Map(doc.tags.map((t) => [t.id, t]));

  const linesForCell = (stageId: string, tagId: string) =>
    (doc.lines[stageId] ?? []).filter((l) => l.tagIds.includes(tagId));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1600px] px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to map
            </Link>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Conclusion · Roadmap
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {doc.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Stat label="Stages" value={doc.stages.length} />
            <Stat label="Lines" value={stats.total} />
            <Stat label="Gaps" value={stats.gaps} tone="destructive" />
            <Stat
              label="On fire"
              value={stats.fires}
              tone="destructive"
              icon={<Flame className="h-3 w-3" />}
            />
            {doc.valueTags.map((v) => (
              <Stat
                key={v.id}
                label={v.name}
                value={stats.byValue[v.id] ?? 0}
                dotColor={v.color as TagColor}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="border-collapse min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-secondary/60 backdrop-blur border-b border-r border-border p-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground min-w-[160px]">
                  Tag
                </th>
                {doc.stages.map((s, i) => {
                  const valueTag = s.valueTagIds
                    .map((id) => valueTagById.get(id))
                    .filter(Boolean)[0] as Tag | undefined;
                  return (
                    <th
                      key={s.id}
                      className={cn(
                        "sticky top-0 z-10 bg-card border-b border-r border-border p-3 text-left align-top min-w-[260px]",
                        s.onFire && "bg-destructive/5",
                      )}
                    >
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Stage {i + 1}
                      </div>
                      <div className="mt-1 flex items-start gap-2">
                        <span className="text-xl leading-none">{s.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm leading-tight truncate">
                            {s.title}
                          </div>
                          <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {s.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {valueTag && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              TAG_PILL[valueTag.color as TagColor],
                            )}
                          >
                            {valueTag.name}
                          </span>
                        )}
                        {s.onFire && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-semibold">
                            <Flame className="h-3 w-3" /> On fire
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {doc.tags.map((tag) => (
                <tr key={tag.id} className="align-top">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-secondary/60 backdrop-blur border-b border-r border-border p-3 text-left min-w-[160px]"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        TAG_PILL[tag.color as TagColor],
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          TAG_DOT[tag.color as TagColor],
                        )}
                      />
                      {tag.name}
                    </span>
                  </th>
                  {doc.stages.map((s) => {
                    const cellLines = linesForCell(s.id, tag.id);
                    return (
                      <td
                        key={s.id}
                        className="border-b border-r border-border p-3 align-top min-w-[260px]"
                      >
                        {cellLines.length === 0 ? (
                          <div className="text-xs text-muted-foreground/50 italic">
                            —
                          </div>
                        ) : (
                          <ul className="space-y-1.5">
                            {cellLines.map((l) => (
                              <li
                                key={l.id}
                                className={cn(
                                  "text-xs leading-snug rounded-md px-2 py-1.5 border",
                                  l.exists
                                    ? "bg-background border-border text-foreground/90"
                                    : "bg-destructive/5 border-dashed border-destructive/40 text-muted-foreground",
                                )}
                              >
                                {l.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  dotColor,
}: {
  label: string;
  value: number;
  tone?: "destructive";
  icon?: React.ReactNode;
  dotColor?: TagColor;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs",
        tone === "destructive" && value > 0 && "border-destructive/40 text-destructive",
      )}
    >
      {dotColor && (
        <span className={cn("h-1.5 w-1.5 rounded-full", TAG_DOT[dotColor])} />
      )}
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}