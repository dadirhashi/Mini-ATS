"use client";

import { useActionState } from "react";
import { updateCandidate } from "./actions";

const input = "mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm";

type Candidate = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  cv_text: string | null;
};

export default function EditCandidateForm({
  candidate: c,
  jobId,
}: {
  candidate: Candidate;
  jobId: string;
}) {
  const [state, formAction, pending] = useActionState(updateCandidate, undefined);

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-gray-700">Redigera</summary>
      <form action={formAction} className="mt-2 grid gap-3 rounded-lg border border-gray-200 p-3">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="job_id" value={jobId} />

        <label className="block">
          <span className="text-xs font-medium">Namn *</span>
          <input name="full_name" required maxLength={200} defaultValue={c.full_name} className={input} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium">E-post</span>
            <input name="email" type="email" defaultValue={c.email ?? ""} className={input} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Telefon</span>
            <input name="phone" type="tel" defaultValue={c.phone ?? ""} className={input} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium">LinkedIn</span>
          <input name="linkedin_url" defaultValue={c.linkedin_url ?? ""} className={input} />
        </label>
        <label className="block">
          <span className="text-xs font-medium">CV-text</span>
          <textarea name="cv_text" rows={5} defaultValue={c.cv_text ?? ""} className={input} />
        </label>
        <label className="block">
          <span className="text-xs font-medium">… eller ersätt med ny PDF</span>
          <input
            name="cv_file"
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-white"
          />
        </label>
        <p className="text-xs text-gray-500">Ändras CV:t nollställs AI-bedömningen – bedöm igen efteråt.</p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
          {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
          {state?.success && <span className="text-xs text-green-700">{state.success}</span>}
        </div>
      </form>
    </details>
  );
}