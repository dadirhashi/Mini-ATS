"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeLinkedIn } from "@/lib/candidates";

export type CandidateFormState = { error?: string; success?: string } | undefined;

export async function createCandidate(
  _prev: CandidateFormState,
  formData: FormData
): Promise<CandidateFormState> {
  const jobId = String(formData.get("job_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const cvText = String(formData.get("cv_text") ?? "").trim();
  const linkedin = normalizeLinkedIn(String(formData.get("linkedin_url") ?? ""));

  if (!jobId) return { error: "Jobb saknas." };
  if (!fullName) return { error: "Namn krävs." };
  if (fullName.length > 200) return { error: "Namnet får vara max 200 tecken." };
  if (email && !isValidEmail(email)) return { error: "Ogiltig e-postadress." };
  if (linkedin.error) return { error: linkedin.error };

  const supabase = await createClient();

  // RLS (can_access_job) avgör om man får lägga kandidater på jobbet:
  // kunden bara på egna jobb, admin på alla.
  const { error } = await supabase.from("candidates").insert({
    job_id: jobId,
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    linkedin_url: linkedin.url,
    cv_text: cvText || null,
    // Nya kandidater hamnar sist i kolumnen "Ansökt" på kanban-tavlan.
    position: Date.now(),
  });

  if (error) {
    console.error("createCandidate:", error.code, error.message);
    if (error.code === "42501") return { error: "Du har inte behörighet till det här jobbet." };
    return { error: "Kunde inte lägga till kandidaten." };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs"); // antal kandidater på jobbkortet
  return { success: `${fullName} lades till.` };
}

export async function deleteCandidate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS ser till att man bara kan radera kandidater på jobb man har åtkomst till.
  const { error } = await supabase.from("candidates").delete().eq("id", id);

  if (error) console.error("deleteCandidate:", error.code, error.message);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}