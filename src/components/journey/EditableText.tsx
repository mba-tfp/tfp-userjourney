import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
};

export function EditableText({ value, onChange, className, multiline, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select?.();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={cn(
          "cursor-text rounded px-1 -mx-1 hover:bg-accent/60 whitespace-pre-wrap",
          !value && "text-muted-foreground italic",
          className,
        )}
      >
        {value || placeholder || "Click to edit"}
      </div>
    );
  }

  const common = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (!multiline || (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        setDraft(value);
        setEditing(false);
      }
    },
    className: cn(
      "w-full rounded border border-input bg-background px-1 py-0.5 outline-none ring-2 ring-ring/40",
      className,
    ),
  };

  return multiline ? (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      rows={Math.max(2, draft.split("\n").length)}
      {...common}
    />
  ) : (
    <input ref={ref as React.RefObject<HTMLInputElement>} {...common} />
  );
}