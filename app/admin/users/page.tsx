import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import CreateUserForm from "./create-user-form";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Bara admins får se sidan. Det riktiga skyddet ligger ändå i RLS och i Edge Function.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  // RLS: admin ser alla profiler.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8 text-gray-900">
        <h1 className="text-2xl font-semibold">Konton</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Skapa nytt konto</h2>
          <CreateUserForm />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Alla konton ({profiles?.length ?? 0})</h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="p-3">Namn</th>
                  <th className="p-3">E-post</th>
                  <th className="p-3">Företag</th>
                  <th className="p-3">Roll</th>
                </tr>
              </thead>
              <tbody>
                {profiles?.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">{p.full_name || "–"}</td>
                    <td className="p-3">{p.email}</td>
                    <td className="p-3">{p.company_name || "–"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.role === "admin" ? "Admin" : "Kund"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}