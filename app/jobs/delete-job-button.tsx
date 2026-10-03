"use client";

import { deleteJob } from "./actions";

export default function DeleteJobButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteJob}
      onSubmit={(e) => {
        if (!confirm(`Radera "${title}"? Alla kandidater på jobbet raderas också.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-sm text-red-600 hover:underline">Radera</button>
    </form>
  );
}