"use server";

import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error?: string; success?: string } | undefined;

export async function changePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current) return { error: "Ange ditt nuvarande lösenord." };
  if (next.length < 8) return { error: "Det nya lösenordet måste vara minst 8 tecken." };
  if (next !== confirm) return { error: "De nya lösenorden matchar inte." };
  if (next === current) return { error: "Det nya lösenordet måste skilja sig från det nuvarande." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Inte inloggad." };

  // Bekräfta det nuvarande lösenordet först. Då kan ingen som kommer åt en
  // öppen, inloggad dator byta lösenord och låsa ut kontoägaren.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verifyError) return { error: "Nuvarande lösenord stämmer inte." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("changePassword:", error.code, error.message);
    if (error.code === "weak_password") return { error: "Lösenordet är för svagt. Välj ett längre." };
    return { error: "Kunde inte byta lösenord. Försök igen." };
  }

  return { success: "Lösenordet är bytt." };
}