"use client";

import { useActionState } from "react";
import { deleteUser } from "./actions";

export default function DeleteUserButton({
  id,
  label,
  jobCount,
}: {
  id: string;
  label: string;
  jobCount: number;
}) {
  const [state, formAction, pending] = useActionState(deleteUser, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const extra =
          jobCount > 0
            ? `\n\nKontots ${jobCount} jobb och alla kandidater på dem raderas också.`
            : "";
        if (!confirm(`Radera kontot för ${label}? Det går inte att ångra.${extra}`)) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Raderar…" : "Radera"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}