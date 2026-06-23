import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flame, Tag as TagIcon, LogOut, Undo2, Redo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useJourney } from "@/lib/journey-store";
import { supabase } from "@/integrations/supabase/client";
import { TAG_DOT } from "@/components/journey/tag-colors";
import { RoadmapTable } from "@/components/journey/RoadmapTable";
import type { TagColor } from "@/lib/journey-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "otto Multi-lenses Journey" },
      { name: "description", content: "Interactive, editable multi-lens patient journey roadmap." },
      { property: "og:title", content: "otto Multi-lenses Journey" },
      { property: "og:description", content: "Interactive, editable multi-lens patient journey roadmap." },
    ],
  }),
  component: ConclusionPage,
});

function ConclusionPage() {
  const j = useJourney();
  const navigate = useNavigate();
  const [showMoneyOnFire, setShowMoneyOnFire] = useState(false);
  const openTagManager = () => navigate({ to: "/tags" });
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const stats = useMemo(() => {
    if (!j.hydrated) return null;
    let total = 0;
    let gaps = 0;
    let fires = 0;
    const byValue: Record<string, number> = {};
    for (const s of j.doc.stages) {
      const lines = j.doc.lines[s.id] ?? [];
      total += lines.length;
      for (const l of lines) {
        if (!l.exists) gaps++;
        if (l.onFire) fires++;
        for (const vt of l.valueTagIds ?? []) {
          byValue[vt] = (byValue[vt] ?? 0) + 1;
        }
      }
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1700px] px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Roadmap
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {doc.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 justify-end">
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
            <span className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={j.undo}
              disabled={!j.canUndo}
              title="Undo (⌘Z)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={j.redo}
              disabled={!j.canRedo}
              title="Redo (⇧⌘Z)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={openTagManager}
              title="Manage tags"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <TagIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowMoneyOnFire((v) => !v)}
              aria-pressed={showMoneyOnFire}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition",
                showMoneyOnFire
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary",
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              Money on fire
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-4 py-8">
        <RoadmapTable
          showMoneyOnFire={showMoneyOnFire}
          onManageTags={openTagManager}
        />
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