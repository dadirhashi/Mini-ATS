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
      {/* Mobil: logga + konto på första raden, menyn på andra raden.
          Från sm (640 px) och uppåt: allt på en rad. */}
      <div className="mx-auto max-w-6xl px-4 py-2 sm:py-0 sm:h-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Link href="/jobs" className="order-1 font-semibold text-base whitespace-nowrap">
          ATS
        </Link>

                  <Link href="/account" className="text-gray-600 hover:text-gray-900">
            Mitt konto
          </Link>

        <nav className="order-3 sm:order-2 w-full sm:w-auto sm:mr-auto flex items-center gap-5 text-sm">
          <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
            Jobb
          </Link>
          <Link href="/board" className="text-gray-600 hover:text-gray-900">
            Kanban
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
              Konton
            </Link>
          )}
        </nav>

        <div className="order-2 sm:order-3 flex items-center gap-3 text-sm">
          <span className="hidden md:inline text-gray-600 truncate max-w-48">
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
            <button className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}