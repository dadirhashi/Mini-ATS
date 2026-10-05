"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeLinkedIn } from "@/lib/candidates";
import { MAX_PDF_BYTES, pdfToText } from "@/lib/pdf";

export type FormState = { error?: string; success?: string } | undefined;
// Äldre namn som formulären importerar.
export type CandidateFormState = FormState;
export type AssessState = FormState;

type CandidateFields = {
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  cv_text: string | null;
};

// Läser och validerar kandidatformuläret. Används av både "lägg till" och "redigera".
// Vid "lägg till" kombineras inklistrad text och PDF. Vid "redigera" ersätter en ny
// PDF texten (annars skulle den gamla CV-texten finnas med två gånger).
async function readCandidateForm(
  formData: FormData,
  mode: "create" | "edit"
): Promise<{ fields: CandidateFields } | { error: string }> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const pastedCv = String(formData.get("cv_text") ?? "").trim();
  const cvFile = formData.get("cv_file");
  const linkedin = normalizeLinkedIn(String(formData.get("linkedin_url") ?? ""));

  if (!fullName) return { error: "Namn krävs." };
  if (fullName.length > 200) return { error: "Namnet får vara max 200 tecken." };
  if (email && !isValidEmail(email)) return { error: "Ogiltig e-postadress." };
  if (linkedin.error) return { error: linkedin.error };

  let pdfText = "";
  if (cvFile instanceof File && cvFile.size > 0) {
    const isPdf = cvFile.type === "application/pdf" || cvFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return { error: "CV-filen måste vara en PDF." };
    if (cvFile.size > MAX_PDF_BYTES) return { error: "PDF-filen får vara max 4 MB." };
    try {
      pdfText = await pdfToText(cvFile);
    } catch (err) {
      console.error("pdfToText:", err);
      return { error: "Kunde inte läsa PDF-filen. Prova att klistra in texten i stället." };
    }
    if (pdfText.length < 30) {
      return {
        error:
          "PDF:en innehåller nästan ingen text (troligen inskannad bild). Klistra in texten i stället.",
      };
    }
  }

  const cvText =
    mode === "edit" && pdfText ? pdfText : [pastedCv, pdfText].filter(Boolean).join("\n\n");

  return {
    fields: {
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      linkedin_url: linkedin.url,
      cv_text: cvText || null,
    },
  };
}

export async function createCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return { error: "Jobb saknas." };

  const parsed = await readCandidateForm(formData, "create");
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();

  // RLS (can_access_job) avgör om man får lägga kandidater på jobbet:
  // kunden bara på egna jobb, admin på alla.
  const { error } = await supabase.from("candidates").insert({
    ...parsed.fields,
    job_id: jobId,
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
  return { success: `${parsed.fields.full_name} lades till.` };
}

export async function updateCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  if (!id) return { error: "Kandidat saknas." };

  const parsed = await readCandidateForm(formData, "edit");
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  // RLS avgör åtkomsten. Påverkas 0 rader saknas behörighet (eller kandidaten finns inte).
  const { data, error } = await supabase
    .from("candidates")
    .update(parsed.fields)
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("updateCandidate:", error.code, error.message);
    return { error: "Kunde inte spara ändringarna." };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/board");
  return { success: "Sparat." };
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

export async function updateJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "");

  if (!id) return { error: "Jobb saknas." };
  if (!title) return { error: "Titel krävs." };
  if (title.length > 200) return { error: "Titeln får vara max 200 tecken." };
  if (status !== "open" && status !== "closed") return { error: "Ogiltig status." };

  const supabase = await createClient();
  // RLS: kunden kan bara ändra egna jobb, admin alla.
  const { data, error } = await supabase
    .from("jobs")
    .update({ title, description, status })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("updateJob:", error.code, error.message);
    return { error: "Kunde inte spara jobbet." };
  }

  revalidatePath(`/jobs/${id}`);
  revalidatePath("/jobs");
  revalidatePath("/board");
  return { success: "Jobbet sparades." };
}

// Ber Edge Function assess-cv att AI-bedöma kandidatens CV mot jobbet.
// Funktionen kontrollerar själv att användaren har åtkomst till kandidaten.
export async function assessCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  if (!id) return { error: "Kandidat saknas." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("assess-cv", {
    body: { candidate_id: id },
  });

  if (error) {
    let message = "Kunde inte göra AI-bedömningen.";
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {}
    return { error: message };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/board");
  return { success: `Klar: ${data.score}/10` };
}