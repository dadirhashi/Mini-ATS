"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { STAGES, STAGE_COLORS, STAGE_LABELS, scoreColor, type Stage } from "@/lib/candidates";
import { moveCandidate } from "./actions";

type Customer = { full_name: string; company_name: string | null } | null;

export type BoardCandidate = {
  id: string;
  full_name: string;
  stage: Stage;
  position: number;
  ai_score: number | null; // AI-betyg 1–10, null om inte bedömd
  job: { id: string; title: string; customer: Customer };
};

export type BoardJob = { id: string; title: string; customer: Customer };

const customerName = (c: Customer) => (c ? c.company_name || c.full_name : "");
const byPosition = (a: BoardCandidate, b: BoardCandidate) => a.position - b.position;
// Högst betyg först; obedömda sist, i sin vanliga ordning.
const byScore = (a: BoardCandidate, b: BoardCandidate) =>
  (b.ai_score ?? -1) - (a.ai_score ?? -1) || byPosition(a, b);

// Släpp-mål har prefix så att vi vet om kortet släpptes på en kolumn eller på
// ett annat kort: "col:interview" eller "card:<kandidat-id>".
const COL = "col:";
const CARD = "card:";

// Pekar musen på ett kort vinner kortet (= lägg före det kortet), annars
// kolumnen (= lägg sist; därför har kolumnen tom yta längst ned).
// Tangentbordet saknar pekare och använder överlapp i stället.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const card = hits.find((h) => String(h.id).startsWith(CARD));
  if (card) return [card];
  if (hits.length) return hits;
  return rectIntersection(args);
};

export default function Board({
  candidates,
  jobs,
  showCustomer,
  initialJobId = "",
}: {
  candidates: BoardCandidate[];
  jobs: BoardJob[];
  showCustomer: boolean;
  initialJobId?: string;
}) {
  // Lokal kopia av korten. Ändras direkt vid släpp (optimistiskt) och
  // återställs om servern säger nej.
  const [items, setItems] = useState(candidates);
  const [jobId, setJobId] = useState(initialJobId); // "" = alla jobb
  const [query, setQuery] = useState("");
  const [sortByScore, setSortByScore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fast id förhindrar varningar om olika id mellan server och webbläsare.
  const dndId = useId();
  const sensors = useSensors(
    // Musen måste röra sig 5 px innan drag startar, så att klick på länkar fungerar.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // På mobil: håll kvar fingret en kort stund, annars scrollar man som vanligt.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Inga kandidater än. Öppna ett jobb under{" "}
        <Link href="/jobs" className="underline">
          Jobb
        </Link>{" "}
        och lägg till en kandidat.
      </p>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = items
    .filter((c) => (!jobId || c.job.id === jobId) && (!q || c.full_name.toLowerCase().includes(q)))
    .sort(sortByScore ? byScore : byPosition);
  const isFiltered = jobId !== "" || q !== "";
  const activeCard = activeId ? items.find((c) => c.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const movingId = String(active.id);
    const moving = items.find((c) => c.id === movingId);
    if (!moving) return;

    // 1. Vart släpptes kortet?
    const overId = String(over.id);
    let stage: Stage;
    let beforeId: string | null = null; // null = sist i kolumnen
    if (overId.startsWith(COL)) {
      stage = overId.slice(COL.length) as Stage;
    } else {
      const target = items.find((c) => c.id === overId.slice(CARD.length));
      if (!target || target.id === movingId) return;
      stage = target.stage;
      // Sorterat på AI-betyg styr betyget ordningen, så kortet läggs bara i kolumnen.
      beforeId = sortByScore ? null : target.id;
    }
    if (sortByScore && moving.stage === stage) return; // ordningen styrs av betyget

    // 2. Räkna ut ny position: mitt emellan grannarna. Då behöver inga andra
    //    kort numreras om – bara det flyttade kortet sparas.
    const column = items.filter((c) => c.stage === stage && c.id !== movingId).sort(byPosition);
    let position: number;
    if (beforeId === null) {
      const last = column[column.length - 1];
      // Redan sist i samma kolumn: inget att göra.
      if (moving.stage === stage && (!last || moving.position > last.position)) return;
      position = last ? last.position + 1000 : 1000;
    } else {
      const index = column.findIndex((c) => c.id === beforeId);
      const next = column[index];
      const prev = column[index - 1];
      // Ligger redan precis före målkortet: inget att göra.
      if (
        moving.stage === stage &&
        moving.position < next.position &&
        (!prev || moving.position > prev.position)
      ) {
        return;
      }
      position = prev ? (prev.position + next.position) / 2 : next.position - 1000;
    }

    // 3. Uppdatera direkt i webbläsaren, spara sedan på servern.
    const previous = items;
    setError(null);
    setItems((cur) =>
      cur.map((c) => (c.id === movingId ? { ...c, stage, position } : c)).sort(byPosition)
    );
    moveCandidate(movingId, stage, position).then((res) => {
      if (res.error) {
        setItems(previous);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          aria-label="Filtrera på jobb"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alla jobb</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {showCustomer && j.customer ? `${customerName(j.customer)} – ${j.title}` : j.title}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök kandidat…"
          aria-label="Sök på kandidatnamn"
          className="w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={sortByScore}
            onChange={(e) => setSortByScore(e.target.checked)}
            className="h-4 w-4"
          />
          Sortera på AI-betyg
        </label>

        {isFiltered && (
          <>
            <span className="text-sm text-gray-500">
              Visar {visible.length} av {items.length}
            </span>
            <button
              onClick={() => {
                setJobId("");
                setQuery("");
              }}
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Rensa filter
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/* Sex kolumner bredvid varandra. På smal skärm scrollar man i sidled. */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} count={visible.filter((c) => c.stage === stage).length}>
              {visible
                .filter((c) => c.stage === stage)
                .map((c) => (
                  <DraggableCard key={c.id} candidate={c} showCustomer={showCustomer} />
                ))}
            </Column>
          ))}
        </div>

        {/* Kopian som följer med pekaren medan man drar. */}
        <DragOverlay>
          {activeCard ? <CardBody candidate={activeCard} showCustomer={showCustomer} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {isFiltered && visible.length === 0 && (
        <p className="text-sm text-gray-600">Inga kandidater matchar filtret.</p>
      )}
    </div>
  );
}

function Column({
  stage,
  count,
  children,
}: {
  stage: Stage;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: COL + stage });

  return (
    <section
      ref={setNodeRef}
      className={`w-56 shrink-0 rounded-xl p-2 pb-8 flex flex-col gap-2 min-h-40 transition-colors ${
        isOver ? "bg-blue-100" : "bg-gray-200/60"
      }`}
    >
      <header className="flex items-center justify-between px-1 pt-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}>
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-xs text-gray-500">{count}</span>
      </header>
      {children}
    </section>
  );
}

function DraggableCard({
  candidate,
  showCustomer,
}: {
  candidate: BoardCandidate;
  showCustomer: boolean;
}) {
  // Kortet går både att dra och att släppa andra kort på (= lägg före).
  const drag = useDraggable({ id: candidate.id });
  const drop = useDroppable({ id: CARD + candidate.id });

  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      {...drag.listeners}
      {...drag.attributes}
      aria-label={`${candidate.full_name}, ${STAGE_LABELS[candidate.stage]}. Dra för att flytta.`}
      className={`rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        drag.isDragging ? "opacity-40" : ""
      } ${drop.isOver && !drag.isDragging ? "border-t-4 border-blue-500" : ""}`}
    >
      <CardBody candidate={candidate} showCustomer={showCustomer} />
    </div>
  );
}

function CardBody({
  candidate: c,
  showCustomer,
  dragging = false,
}: {
  candidate: BoardCandidate;
  showCustomer: boolean;
  dragging?: boolean;
}) {
  return (
    <article
      className={`rounded-lg bg-white p-2.5 text-sm cursor-grab ${
        dragging ? "shadow-lg rotate-2 cursor-grabbing" : "shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight">{c.full_name}</p>
        {c.ai_score != null && (
          <span
            title="AI-matchning mot jobbet"
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${scoreColor(c.ai_score)}`}
          >
            {c.ai_score}/10
          </span>
        )}
      </div>
      <Link
        href={`/jobs/${c.job.id}`}
        className="block text-xs text-gray-500 hover:underline truncate"
      >
        {c.job.title}
      </Link>
      {showCustomer && c.job.customer && (
        <p className="text-xs text-gray-400 truncate">{customerName(c.job.customer)}</p>
      )}
    </article>
  );
}