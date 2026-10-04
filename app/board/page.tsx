import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import Board, { type BoardCandidate, type BoardJob } from "./board";

// ?job=<id> i adressen förväljer jobbet i filtret (länk från jobbsidan).
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job: jobParam } = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  // RLS: kunden får bara kandidater på sina egna jobb, admin får alla.
  // Sorteras på position så att korten ligger i samma ordning som de dragits.
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select(
      "id, full_name, stage, position, job:jobs!inner(id, title, customer:profiles!jobs_customer_id_fkey(full_name, company_name))"
    )
    .order("position", { ascending: true })
    .overrideTypes<BoardCandidate[], { merge: false }>();

  // Alla jobb man har åtkomst till, till filtret (även jobb utan kandidater).
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, customer:profiles!jobs_customer_id_fkey(full_name, company_name)")
    .order("title")
    .overrideTypes<BoardJob[], { merge: false }>();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1400px] p-4 sm:p-8 space-y-6 text-gray-900">
        <h1 className="text-2xl font-semibold">Kanban</h1>

        {error ? (
          <p className="text-sm text-red-600">Kunde inte hämta kandidaterna.</p>
        ) : (
          <Board
            candidates={candidates ?? []}
            jobs={jobs ?? []}
            showCustomer={!!isAdmin}
            // Bara ett jobb man faktiskt har åtkomst till kan förväljas.
            initialJobId={jobs?.some((j) => j.id === jobParam) ? jobParam : ""}
          />
        )}
      </main>
    </>
  );
}