"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        action={formAction}
        className="w-full max-w-sm bg-white text-gray-900 rounded-xl shadow p-8 space-y-4"
      >
        <h1 className="text-2xl font-semibold">ATS</h1>
        <p className="text-sm text-gray-500">Logga in för att fortsätta</p>

        <label className="block">
          <span className="text-sm font-medium">E-post</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Lösenord</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-gray-900 text-white py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Loggar in…" : "Logga in"}
        </button>
      </form>
    </main>
  );
}