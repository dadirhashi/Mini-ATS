"use client";

import { useActionState } from "react";
import { assessCandidate } from "./actions";

export default function AssessButton({
  id,
  jobId,
  hasCv,
  assessed,
}: {
  id: string;
  jobId: string;
  hasCv: boolean;
  assessed: boolean;
}) {
  const [state, formAction, pending] = useActionState(assessCandidate, undefined);

  if (!hasCv) {
    return <p className="text-xs text-gray-400">Inget CV – AI-bedömning inte möjlig.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="job_id" value={jobId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Bedömer…" : assessed ? "Bedöm igen" : "✨ AI-bedöm CV"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}