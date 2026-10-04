"use client";

import Link from "next/link";
import { STAGES, STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/candidates";

export type BoardCandidate = {
  id: string;
  full_name: string;
  stage: Stage;
  position: number;
  job: {
    id: string;
    title: string;
    customer: { full_name: string; company_name: string | null } | null;
  };
};

// Klientkomponent: just nu visar den bara korten, men dra-och-släpp och
// filter kommer att köras här i webbläsaren.
export default function Board({
  candidates,
  showCustomer,
}: {
  candidates: BoardCandidate[];
  showCustomer: boolean;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Inga kandidater än. Öppna ett jobb under{" "}
        <Link href="/jobs" className="underline">
          Jobb
        </Link>{" "}
        och lägg till en kandidat.
      </p>
    );
  }

  return (
    // Sex kolumner bredvid varandra. På smal skärm scrollar man i sidled.
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const cards = candidates.filter((c) => c.stage === stage);
        return (
          <section
            key={stage}
            className="w-56 shrink-0 rounded-xl bg-gray-200/60 p-2 flex flex-col gap-2"
          >
            <header className="flex items-center justify-between px-1 pt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-gray-500">{cards.length}</span>
            </header>

            {cards.map((c) => (
              <article key={c.id} className="rounded-lg bg-white shadow-sm p-2.5 text-sm">
                <p className="font-medium leading-tight">{c.full_name}</p>
                <Link
                  href={`/jobs/${c.job.id}`}
                  className="block text-xs text-gray-500 hover:underline truncate"
                >
                  {c.job.title}
                </Link>
                {showCustomer && c.job.customer && (
                  <p className="text-xs text-gray-400 truncate">
                    {c.job.customer.company_name || c.job.customer.full_name}
                  </p>
                )}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}