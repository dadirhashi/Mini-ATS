"use client";

import { useState } from "react";
import Link from "next/link";
import { STAGES, STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/candidates";

type Customer = { full_name: string; company_name: string | null } | null;

export type BoardCandidate = {
  id: string;
  full_name: string;
  stage: Stage;
  position: number;
  job: { id: string; title: string; customer: Customer };
};

export type BoardJob = { id: string; title: string; customer: Customer };

const customerName = (c: Customer) => (c ? c.company_name || c.full_name : "");

// Klientkomponent: filtreringen sker direkt i webbläsaren utan ny
// serverförfrågan, så listan uppdateras medan man skriver.
export default function Board({
  candidates,
  jobs,
  showCustomer,
}: {
  candidates: BoardCandidate[];
  jobs: BoardJob[];
  showCustomer: boolean;
}) {
  const [jobId, setJobId] = useState(""); // "" = alla jobb
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const visible = candidates.filter(
    (c) =>
      (!jobId || c.job.id === jobId) && (!q || c.full_name.toLowerCase().includes(q))
  );
  const isFiltered = jobId !== "" || q !== "";

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          aria-label="Filtrera på jobb"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alla jobb</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {showCustomer && j.customer ? `${customerName(j.customer)} – ${j.title}` : j.title}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök kandidat…"
          aria-label="Sök på kandidatnamn"
          className="w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        {isFiltered && (
          <>
            <span className="text-sm text-gray-500">
              Visar {visible.length} av {candidates.length}
            </span>
            <button
              onClick={() => {
                setJobId("");
                setQuery("");
              }}
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Rensa filter
            </button>
          </>
        )}
      </div>

      {/* Tavlan: sex kolumner bredvid varandra. På smal skärm scrollar man i sidled. */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = visible.filter((c) => c.stage === stage);
          return (
            <section
              key={stage}
              className="w-56 shrink-0 rounded-xl bg-gray-200/60 p-2 flex flex-col gap-2"
            >
              <header className="flex items-center justify-between px-1 pt-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}
                >
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
                    <p className="text-xs text-gray-400 truncate">{customerName(c.job.customer)}</p>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {isFiltered && visible.length === 0 && (
        <p className="text-sm text-gray-600">Inga kandidater matchar filtret.</p>
      )}
    </div>
  );
}