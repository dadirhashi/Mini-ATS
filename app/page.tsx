import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Läses via RLS: du får bara se din egen profil (eller alla, om du är admin).
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <main className="min-h-screen p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Mini-ATS</h1>

      {error ? (
        <p className="text-red-600">Kunde inte läsa profilen: {error.message}</p>
      ) : (
        <p>
          Inloggad som <strong>{profile.email}</strong> med rollen{" "}
          <strong>{profile.role}</strong>
        </p>
      )}

      {profile?.role === "admin" && (
        <Link href="/admin/users" className="inline-block underline">
          Hantera konton →
        </Link>
      )}

      <form action={logout}>
        <button className="rounded-md border px-4 py-2">Logga ut</button>
      </form>
    </main>
  );
}