"use client";

import { useActionState } from "react";
import { updateJob } from "./actions";

const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2";

export default function EditJobForm({
  job,
}: {
  job: { id: string; title: string; description: string; status: "open" | "closed" };
}) {
  const [state, formAction, pending] = useActionState(updateJob, undefined);

  return (
    <details className="rounded-xl bg-white shadow">
      <summary className="cursor-pointer select-none px-6 py-3 text-sm font-medium">
        Redigera jobb
      </summary>
      <form action={formAction} className="grid gap-4 px-6 pb-6">
        <input type="hidden" name="id" value={job.id} />

        <label className="block">
          <span className="text-sm font-medium">Titel</span>
          <input name="title" required maxLength={200} defaultValue={job.title} className={input} />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Beskrivning</span>
          <textarea name="description" rows={5} defaultValue={job.description} className={input} />
        </label>

        <label className="block sm:w-48">
          <span className="text-sm font-medium">Status</span>
          <select name="status" defaultValue={job.status} className={input}>
            <option value="open">Öppen</option>
            <option value="closed">Stängd</option>
          </select>
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
        </div>
      </form>
    </details>
  );
}