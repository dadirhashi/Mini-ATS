"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateUserState = { error?: string; success?: string } | undefined;
export type DeleteUserState = { error?: string } | undefined;

// Edge Functions svarar med { error: "..." } vid fel. Plocka ut texten om den finns.
async function functionError(error: unknown, fallback: string): Promise<string> {
  try {
    const body = await (error as { context: Response }).context.json();
    if (body?.error) return body.error;
  } catch {}
  return fallback;
}

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke("create-user", {
    body: {
      email: formData.get("email"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
      company_name: formData.get("company_name"),
      role: formData.get("role"),
    },
  });

  if (error) return { error: await functionError(error, "Kunde inte skapa kontot.") };

  revalidatePath("/admin/users");
  return { success: `Kontot för ${data.email} skapades.` };
}

// Edge Function delete-user kontrollerar själv att anroparen är admin.
export async function deleteUser(
  _prev: DeleteUserState,
  formData: FormData
): Promise<DeleteUserState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Konto saknas." };

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("delete-user", {
    body: { user_id: id },
  });

  if (error) return { error: await functionError(error, "Kunde inte radera kontot.") };

  // Kontots jobb och kandidater är borta, så alla sidor ska hämta om.
  revalidatePath("/", "layout");
  return undefined;
}