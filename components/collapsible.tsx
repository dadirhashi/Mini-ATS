// Hopfällbar sektion med en knapp som öppnar/stänger innehållet.
// Byggd på HTML:s <details>, så den fungerar utan JavaScript och kan
// användas i både server- och klientkomponenter.
export default function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="inline-flex cursor-pointer select-none list-none items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-base leading-none transition-transform group-open:rotate-45">
          +
        </span>
        <span className="group-open:hidden">{title}</span>
        <span className="hidden group-open:inline">Stäng</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}