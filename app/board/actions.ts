"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STAGES, type Stage } from "@/lib/candidates";

// Anropas när ett kort släpps på tavlan. Sparar nytt steg och ny position.
export async function moveCandidate(
  id: string,
  stage: Stage,
  position: number
): Promise<{ error?: string }> {
  if (!STAGES.includes(stage) || !Number.isFinite(position)) {
    return { error: "Ogiltig flytt." };
  }

  const supabase = await createClient();

  // RLS (can_access_job) avgör om man får ändra kandidaten. Får man inte det
  // påverkas 0 rader, därför ber vi om de uppdaterade raderna tillbaka.
  const { data, error } = await supabase
    .from("candidates")
    .update({ stage, position })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("moveCandidate:", error.code, error.message);
    return { error: "Kunde inte flytta kandidaten. Ladda om sidan och försök igen." };
  }

  // Stegmärket på jobbsidan ska också visa det nya steget.
  revalidatePath("/jobs", "layout");
  return {};
}