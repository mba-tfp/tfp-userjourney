import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const loadJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("journeys")
      .select("doc")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { doc: (data?.doc as unknown) ?? null };
  });

export const saveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { doc: unknown }) => {
    if (!input || typeof input !== "object" || !("doc" in input)) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journeys")
      .upsert({ user_id: userId, doc: data.doc as any }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });