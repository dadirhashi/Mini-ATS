"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "./actions";

const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Töm fälten när bytet lyckats, så att lösenorden inte ligger kvar på skärmen.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 bg-white text-gray-900 rounded-xl shadow p-6 max-w-md"
    >
      <label className="block">
        <span className="text-sm font-medium">Nuvarande lösenord</span>
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Nytt lösenord (minst 8 tecken)</span>
        <input
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Upprepa nytt lösenord</span>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Byter…" : "Byt lösenord"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}