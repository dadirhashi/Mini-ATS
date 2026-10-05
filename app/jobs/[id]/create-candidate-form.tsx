"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCandidate } from "./actions";

const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2";

export default function CreateCandidateForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(createCandidate, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 bg-white text-gray-900 rounded-xl shadow p-6"
    >
      <input type="hidden" name="job_id" value={jobId} />

      <label className="block">
        <span className="text-sm font-medium">Namn *</span>
        <input name="full_name" required maxLength={200} placeholder="Förnamn Efternamn" className={input} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">E-post</span>
          <input name="email" type="email" placeholder="namn@exempel.se" className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Telefon</span>
          <input name="phone" type="tel" placeholder="070-123 45 67" className={input} />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">LinkedIn</span>
        <input
          name="linkedin_url"
          placeholder="https://www.linkedin.com/in/namn"
          className={input}
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">CV</legend>
        <label className="block">
          <span className="text-xs text-gray-600">Ladda upp PDF (max 4 MB)</span>
          <input
            name="cv_file"
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-white hover:file:bg-gray-700"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">… och/eller klistra in texten</span>
          <textarea
            name="cv_text"
            rows={5}
            placeholder="Klistra in CV-texten här. Används av AI-bedömningen."
            className={input}
          />
        </label>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Lägger till…" : "Lägg till kandidat"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}