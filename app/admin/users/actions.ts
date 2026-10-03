"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateUserState = { error?: string; success?: string } | undefined;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const supabase = await createClient();

  // invoke skickar automatiskt med den inloggades token till funktionen.
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: {
      email: formData.get("email"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
      company_name: formData.get("company_name"),
      role: formData.get("role"),
    },
  });

  if (error) {
    let message = "Kunde inte skapa kontot.";
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {}
    return { error: message };
  }

  revalidatePath("/admin/users");
  return { success: `Kontot för ${data.email} skapades.` };
}