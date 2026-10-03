"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "./actions";

const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2";

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2 bg-white text-gray-900 rounded-xl shadow p-6">
      <label className="block">
        <span className="text-sm font-medium">Namn</span>
        <input name="full_name" required className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Företag</span>
        <input name="company_name" className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">E-post</span>
        <input name="email" type="email" required className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Tillfälligt lösenord</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Roll</span>
        <select name="role" defaultValue="customer" className={input}>
          <option value="customer">Kund</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      <div className="sm:col-span-2 flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-md bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50">
          {pending ? "Skapar…" : "Skapa konto"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}