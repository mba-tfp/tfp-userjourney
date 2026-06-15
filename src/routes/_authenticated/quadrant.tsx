import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Tag as TagIcon, Undo2, Redo2, ListChecks } from "lucide-react";
import { useJourney } from "@/lib/journey-store";
import { supabase } from "@/integrations/supabase/client";
import { QuadrantBoard } from "@/components/journey/QuadrantBoard";

export const Route = createFileRoute("/_authenticated/quadrant")({
  component: QuadrantPage,
});

function QuadrantPage() {
  const j = useJourney();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!j.hydrated) {
    return (
      <div className="min-h-dvh bg-background px-8 py-10">
        <div className="h-3 w-48 rounded bg-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1700px] px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to map
            </Link>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Priority · Quadrant
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {j.doc.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1 pt-2 justify-end">
            <button
              onClick={j.undo}
              disabled={!j.canUndo}
              title="Undo (⌘Z)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={j.redo}
              disabled={!j.canRedo}
              title="Redo (⇧⌘Z)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition disabled:opacity-40"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={() => navigate({ to: "/conclusion" })}
              title="Roadmap"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <ListChecks className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate({ to: "/tags" })}
              title="Manage tags"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <TagIcon className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
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

      <main className="mx-auto max-w-[1700px] px-6 py-8">
        <QuadrantBoard />
      </main>
    </div>
  );
}