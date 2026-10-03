"use client";

import { useActionState, useEffect, useRef } from "react";
import { createJob } from "./actions";

type Customer = { id: string; full_name: string; company_name: string | null };

const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2";

export default function CreateJobForm({
  isAdmin,
  customers,
}: {
  isAdmin: boolean;
  customers: Customer[];
}) {
  const [state, formAction, pending] = useActionState(createJob, undefined);
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
      {isAdmin && (
        <label className="block">
          <span className="text-sm font-medium">Kund</span>
          <select name="customer_id" required defaultValue="" className={input}>
            <option value="" disabled>
              Välj vilken kund jobbet gäller…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name ? `${c.company_name} (${c.full_name})` : c.full_name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium">Titel</span>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="t.ex. Backendutvecklare"
          className={input}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Beskrivning</span>
        <textarea
          name="description"
          rows={4}
          placeholder="Vad jobbet innebär och vilka krav som finns. Används också av AI-bedömningen."
          className={input}
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Skapar…" : "Skapa jobb"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}