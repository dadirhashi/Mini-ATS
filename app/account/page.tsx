import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import ChangePasswordForm from "./change-password-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, company_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8 text-gray-900">
        <h1 className="text-2xl font-semibold">Mitt konto</h1>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr] max-w-md">
          <dt className="text-gray-500">Namn</dt>
          <dd>{profile?.full_name || "–"}</dd>
          <dt className="text-gray-500">E-post</dt>
          <dd>{profile?.email}</dd>
          <dt className="text-gray-500">Företag</dt>
          <dd>{profile?.company_name || "–"}</dd>
          <dt className="text-gray-500">Roll</dt>
          <dd>{profile?.role === "admin" ? "Admin" : "Kund"}</dd>
        </dl>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Byt lösenord</h2>
          <p className="text-sm text-gray-600 max-w-md">
            Ditt första lösenord sattes av en admin. Byt gärna till ett eget.
          </p>
          <ChangePasswordForm />
        </section>
      </main>
    </>
  );
}