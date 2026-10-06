import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import Collapsible from "@/components/collapsible";
import CreateUserForm from "./create-user-form";
import DeleteUserButton from "./delete-user-button";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  company_name: string | null;
  role: "admin" | "customer";
  created_at: string;
  jobs: { count: number }[];
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Bara admins får se sidan. Det riktiga skyddet ligger ändå i RLS och i Edge Functions.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: admin ser alla profiler och alla jobb. jobs(count) = antal jobb per konto.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, role, created_at, jobs(count)")
    .order("created_at", { ascending: false })
    .overrideTypes<ProfileRow[], { merge: false }>();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8 text-gray-900">
        <h1 className="text-2xl font-semibold">Konton</h1>

        {/* Öppen från början bara när admin är ensam; annars en knapp. */}
        <Collapsible title="Skapa nytt konto" defaultOpen={(profiles?.length ?? 0) <= 1}>
          <CreateUserForm />
        </Collapsible>

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
                  <th className="p-3">Jobb</th>
                  <th className="p-3">
                    <span className="sr-only">Radera</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles?.map((p) => {
                  const jobCount = p.jobs?.[0]?.count ?? 0;
                  return (
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
                      <td className="p-3">{jobCount}</td>
                      <td className="p-3 text-right">
                        {p.id === user?.id ? (
                          <span className="text-xs text-gray-400">Du</span>
                        ) : (
                          <DeleteUserButton
                            id={p.id}
                            label={p.full_name || p.email || "kontot"}
                            jobCount={jobCount}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}