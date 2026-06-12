import type { TagColor } from "@/lib/journey-data";

// Returns Tailwind classes for a tag's pill + dot swatch
export const TAG_PILL: Record<TagColor, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
  amber: "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200",
};

export const TAG_DOT: Record<TagColor, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  fuchsia: "bg-fuchsia-500",
};