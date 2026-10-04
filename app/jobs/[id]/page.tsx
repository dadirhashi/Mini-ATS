import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/app-header";
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/candidates";
import CreateCandidateForm from "./create-candidate-form";
import DeleteCandidateButton from "./delete-candidate-button";

type JobDetail = {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  customer: { full_name: string; company_name: string | null } | null;
};

type CandidateRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  cv_text: string | null;
  stage: Stage;
  created_at: string;
};

// [id] i mappnamnet gör att sidan svarar på /jobs/<vilket id som helst>.
// Ungefär som en route-parameter {id} i ASP.NET.
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: finns jobbet inte, eller tillhör det en annan kund, blir svaret tomt
  // och vi visar 404. En kund kan alltså inte gissa sig till andras jobb.
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, description, status, customer:profiles!jobs_customer_id_fkey(full_name, company_name)"
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<JobDetail, { merge: false }>();

  if (!job) notFound();

  const { data: isAdmin } = await supabase.rpc("is_admin");

  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone, linkedin_url, cv_text, stage, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .overrideTypes<CandidateRow[], { merge: false }>();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-8 text-gray-900">
        <div className="space-y-2">
         <div className="flex items-center justify-between gap-4">
            <Link href="/jobs" className="text-sm text-gray-600 hover:underline">
             ← Alla jobb
            </Link>
            <Link
             href={`/board?job=${job.id}`}
              className="text-sm font-medium text-gray-900 hover:underline"
            >
              Visa på kanban →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                job.status === "open"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {job.status === "open" ? "Öppen" : "Stängd"}
            </span>
          </div>
          {isAdmin && job.customer && (
            <p className="text-sm text-gray-500">
              Kund: {job.customer.company_name || job.customer.full_name}
            </p>
          )}
          {job.description && (
            <p className="text-sm text-gray-600 whitespace-pre-line max-w-3xl">
              {job.description}
            </p>
          )}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Lägg till kandidat</h2>
          <CreateCandidateForm jobId={job.id} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Kandidater ({candidates?.length ?? 0})</h2>

          {error && <p className="text-sm text-red-600">Kunde inte hämta kandidaterna.</p>}

          {candidates?.length === 0 ? (
            <p className="text-sm text-gray-600">Inga kandidater på jobbet än.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {candidates?.map((c) => (
                <li key={c.id} className="bg-white rounded-xl shadow p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{c.full_name}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STAGE_COLORS[c.stage]}`}
                    >
                      {STAGE_LABELS[c.stage]}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {c.email && (
                      <p>
                        <a href={`mailto:${c.email}`} className="hover:underline">
                          {c.email}
                        </a>
                      </p>
                    )}
                    {c.phone && (
                      <p>
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      </p>
                    )}
                    {c.linkedin_url && (
                      <p>
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          LinkedIn-profil ↗
                        </a>
                      </p>
                    )}
                  </div>

                  {c.cv_text && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-700">Visa CV</summary>
                      <p className="mt-2 whitespace-pre-line text-gray-600 max-h-64 overflow-y-auto">
                        {c.cv_text}
                      </p>
                    </details>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400">
                      Tillagd {new Date(c.created_at).toLocaleDateString("sv-SE")}
                    </span>
                    <DeleteCandidateButton id={c.id} jobId={job.id} name={c.full_name} />
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