import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import Board, { type BoardCandidate } from "./board";

export default async function BoardPage() {
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

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1400px] p-4 sm:p-8 space-y-6 text-gray-900">
        <h1 className="text-2xl font-semibold">Kanban</h1>

        {error ? (
          <p className="text-sm text-red-600">Kunde inte hämta kandidaterna.</p>
        ) : (
          <Board candidates={candidates ?? []} showCustomer={!!isAdmin} />
        )}
      </main>
    </>
  );
}