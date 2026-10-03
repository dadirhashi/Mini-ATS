"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JobFormState = { error?: string; success?: string } | undefined;

export async function createJob(
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  // Skickas bara från admins formulär. Kunder får customer_id = sitt eget id
  // automatiskt (default auth.uid() i databasen).
  const customerId = String(formData.get("customer_id") ?? "").trim();

  if (!title) return { error: "Titel krävs." };
  if (title.length > 200) return { error: "Titeln får vara max 200 tecken." };

  const supabase = await createClient();

  // RLS avgör om insättningen är tillåten: en kund kan bara skapa jobb åt sig
  // själv, en admin får skapa åt vilken kund som helst.
  const { error } = await supabase.from("jobs").insert({
    title,
    description,
    ...(customerId ? { customer_id: customerId } : {}),
  });

  if (error) {
    console.error("createJob:", error.code, error.message);
    return { error: "Kunde inte skapa jobbet." };
  }

  revalidatePath("/jobs");
  return { success: `Jobbet "${title}" skapades.` };
}

export async function deleteJob(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS ser till att man bara kan radera jobb man har rätt till.
  // Kandidater på jobbet raderas automatiskt (on delete cascade).
  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) console.error("deleteJob:", error.code, error.message);

  revalidatePath("/jobs");
}