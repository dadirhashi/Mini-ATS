"use client";

import { deleteCandidate } from "./actions";

export default function DeleteCandidateButton({
  id,
  jobId,
  name,
}: {
  id: string;
  jobId: string;
  name: string;
}) {
  return (
    <form
      action={deleteCandidate}
      onSubmit={(e) => {
        if (!confirm(`Radera kandidaten ${name}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="job_id" value={jobId} />
      <button className="text-sm text-red-600 hover:underline">Radera</button>
    </form>
  );
}