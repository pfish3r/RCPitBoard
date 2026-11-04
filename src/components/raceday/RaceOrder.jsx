import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RaceRow from "@/components/raceday/RaceRow";

const PAGE_SECONDS = 15;

export default function RaceOrder({ timeline, roundLabel, isActiveRound, timingEstimate, tvMode = false }) {
  const viewport = useRef(null);
  const interacting = useRef(false);
  const manualUntil = useRef(0);
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(timeline.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const start = activePage * pageSize;
  const visible = timeline.slice(start, start + pageSize);
  const firstSeq = timeline[0]?.seq;
  const hasRaces = timeline.length > 0;

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const rowHeight = Number.parseFloat(getComputedStyle(node).getPropertyValue("--race-order-row-height")) || 48;
      if (node.clientHeight > 0) setPageSize(Math.max(1, Math.min(14, Math.floor(node.clientHeight / rowHeight))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasRaces, tvMode]);

  useEffect(() => { setPage(0); }, [roundLabel, firstSeq, pageSize, tvMode]);

  useEffect(() => {
    if (pageCount <= 1 || (!tvMode && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const timer = setInterval(() => {
      if (tvMode || (!interacting.current && Date.now() >= manualUntil.current)) setPage(value => (value + 1) % pageCount);
    }, PAGE_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [pageCount, roundLabel, firstSeq, tvMode]);

  const pickPage = value => {
    manualUntil.current = Date.now() + 30000;
    setPage(value);
    if (viewport.current) viewport.current.scrollTop = 0;
  };

  return (
    <section className="race-order flex min-h-0 flex-col lg:h-full" aria-label="Race order"
      onPointerEnter={() => { interacting.current = true; }}
      onPointerLeave={() => { interacting.current = false; }}
      onFocusCapture={() => { interacting.current = true; }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) interacting.current = false; }}>
      <div className="mb-2 flex shrink-0 items-baseline justify-between gap-3">
        <h2 className="board-title">Race order</h2>
        <span className="text-xs text-rd-muted">{timeline.length} {isActiveRound ? "remaining" : "races"}</span>
      </div>
      <p className="mb-2 shrink-0 truncate text-xs text-rd-muted" title={roundLabel}>
        {roundLabel || "Race lineup"}
        {isActiveRound && ` / Est. gap ${Math.round((timingEstimate?.turnaroundSeconds ?? 120) / 6) / 10} min`}
      </p>
      {timeline.length ? (
        <>
          <div role="table" aria-label={`${roundLabel || "Round"} race order`} className="flex min-h-0 flex-1 flex-col rounded-xl border border-rd-border bg-rd-panel">
            <div role="rowgroup" className="shrink-0 border-b border-rd-border bg-rd-surface">
              <div role="row" className="race-order-grid px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-rd-muted">
                <span role="columnheader">Race</span><span role="columnheader">Class</span>
                <span role="columnheader">Heat</span><span role="columnheader" className="text-right">Est. start</span>
              </div>
            </div>
            <div ref={viewport} role="rowgroup" className="race-order-viewport min-h-0 flex-1 overflow-y-auto">
              {visible.map(race => <RaceRow key={race.seq} race={race} isActiveRound={isActiveRound} />)}
            </div>
          </div>
          <nav aria-label="Race order pages" className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-2 text-xs text-rd-muted">
            <span>{start + 1}-{Math.min(start + pageSize, timeline.length)} of {timeline.length}{tvMode && pageCount > 1 ? " / Auto 15s" : ""}</span>
            <div className="flex items-center gap-1.5">
              {activePage > 0 && <button type="button" onClick={() => pickPage(0)} className="rounded-md border border-rd-border px-2 py-1.5 text-rd-acctext">{isActiveRound ? "Next up" : "First page"}</button>}
              <button type="button" aria-label="Previous races" disabled={activePage === 0} onClick={() => pickPage(activePage - 1)} className="rounded-md border border-rd-border p-1.5 text-rd-bright disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-1 tabular-nums">{activePage + 1}/{pageCount}</span>
              <button type="button" aria-label="Later races" disabled={activePage === pageCount - 1} onClick={() => pickPage(activePage + 1)} className="rounded-md border border-rd-border p-1.5 text-rd-bright disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </nav>
        </>
      ) : (
        <div className="rounded-xl border border-rd-border bg-rd-panel p-4 text-sm text-rd-muted">
          {isActiveRound ? `All races in ${roundLabel || "this round"} are complete.` : `No races published for ${roundLabel || "this round"} yet.`}
        </div>
      )}
    </section>
  );
}


