import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

// Gemensam toppmeny för alla inloggade sidor.
export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <header className="bg-white text-gray-900 border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/jobs" className="font-semibold text-base">
            Mini-ATS
          </Link>
          <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
            Jobb
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
              Konton
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-gray-600">
            {profile?.full_name || profile?.email}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              isAdmin ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
            }`}
          >
            {isAdmin ? "Admin" : "Kund"}
          </span>
          <form action={logout}>
            <button className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}