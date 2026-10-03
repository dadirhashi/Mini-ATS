import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import CreateJobForm from "./create-job-form";
import DeleteJobButton from "./delete-job-button";

type JobRow = {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
  customer: { full_name: string; company_name: string | null } | null;
};

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = me?.role === "admin";

  // RLS: en kund får bara sina egna jobb, en admin får alla.
  // Ingen WHERE-sats behövs här – databasen filtrerar.
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, description, status, created_at, customer:profiles!jobs_customer_id_fkey(full_name, company_name)"
    )
    .order("created_at", { ascending: false })
    .overrideTypes<JobRow[], { merge: false }>();

  // Admin behöver kundlistan för att kunna skapa jobb åt en kund.
  const { data: customers } = isAdmin
    ? await supabase
        .from("profiles")
        .select("id, full_name, company_name")
        .eq("role", "customer")
        .order("company_name")
    : { data: [] };

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8 text-gray-900">
        <h1 className="text-2xl font-semibold">Jobb</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isAdmin ? "Skapa jobb åt en kund" : "Lägg upp ett nytt jobb"}
          </h2>
          {isAdmin && customers?.length === 0 ? (
            <p className="text-sm text-gray-600">
              Det finns inga kunder än. Skapa en kund under Konton först.
            </p>
          ) : (
            <CreateJobForm isAdmin={isAdmin} customers={customers ?? []} />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {isAdmin ? "Alla jobb" : "Dina jobb"} ({jobs?.length ?? 0})
          </h2>

          {error && <p className="text-sm text-red-600">Kunde inte hämta jobben.</p>}

          {jobs?.length === 0 ? (
            <p className="text-sm text-gray-600">Inga jobb än.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {jobs?.map((job) => (
                <li key={job.id} className="bg-white rounded-xl shadow p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{job.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        job.status === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {job.status === "open" ? "Öppen" : "Stängd"}
                    </span>
                  </div>

                  {isAdmin && job.customer && (
                    <p className="text-xs text-gray-500">
                      Kund: {job.customer.company_name || job.customer.full_name}
                    </p>
                  )}

                  {job.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">
                      {job.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleDateString("sv-SE")}
                    </span>
                    <DeleteJobButton id={job.id} title={job.title} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}