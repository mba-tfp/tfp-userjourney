import { createFileRoute } from "@tanstack/react-router";
import { JourneyMap } from "@/components/journey/JourneyMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "otto Multi-lenses Journey" },
      { name: "description", content: "Interactive, editable multi-lens patient journey map." },
      { property: "og:title", content: "otto Multi-lenses Journey" },
      { property: "og:description", content: "Interactive, editable multi-lens patient journey map." },
    ],
  }),
  component: Index,
});

function Index() {
  return <JourneyMap />;
}
