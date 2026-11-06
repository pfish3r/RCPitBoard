import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RaceRow from "@/components/raceday/RaceRow";
import { raceOrderSpread, raceRectanglePageSize } from "@/lib/raceOrderPaging";

const PAGE_SECONDS = 15;

export default function RaceOrder({ timeline, roundLabel, isActiveRound, timingEstimate, tvMode = false, rowHeight = 84, fontScale = 1 }) {
  const viewport = useRef(null);
  const interacting = useRef(false);
  const manualUntil = useRef(0);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(0);
  const { pageCount, activePage, start, end, groups } = raceOrderSpread(timeline, pageSize, page, 1);
  const firstSeq = timeline[0]?.seq;
  const hasRaces = timeline.length > 0;

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      if (!width) return;
      const font = parseFloat(getComputedStyle(node).getPropertyValue('--panel-font-factor')) || 1;
      setPageSize(raceRectanglePageSize(node.clientHeight, font, rowHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasRaces, tvMode, rowHeight, fontScale]);

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
    <section className="race-order race-order-cards flex min-h-0 flex-col lg:h-full" aria-label="Race order"
      onPointerEnter={() => { interacting.current = true; }}
      onPointerLeave={() => { interacting.current = false; }}
      onFocusCapture={() => { interacting.current = true; }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) interacting.current = false; }}>
      <header className="race-card-heading">
        <h2 className="board-title">Race order</h2>
        <p title={roundLabel}>{roundLabel || "Race lineup"}{isActiveRound && ` / Est. gap ${Math.round((timingEstimate?.turnaroundSeconds ?? 120) / 6) / 10} min`}</p>
        <span>{timeline.length} {isActiveRound ? "remaining" : "races"}</span>
      </header>
      {timeline.length ? (
        <>
          <div ref={viewport} className="race-card-grid race-rectangle-list" style={{ "--race-card-rows": groups[0].length }} role="list" aria-label="Upcoming races">
            {groups[0].map(race => <RaceRow key={race.seq} race={race} isActiveRound={isActiveRound} />)}
          </div>
          <nav aria-label="Race order pages" className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-2 text-xs text-rd-muted">
            <span>{start + 1}-{end} of {timeline.length}{tvMode && pageCount > 1 ? " / Auto 15s" : ""}</span>
            <div className="flex items-center gap-1.5">
              {activePage > 0 && <button type="button" onClick={() => pickPage(0)} className="rounded-md border border-rd-border px-2 py-1.5 text-rd-acctext">{isActiveRound ? "Next up" : "First page"}</button>}
              <button type="button" aria-label="Previous races" disabled={activePage === 0} onClick={() => pickPage(activePage - 1)} className="rounded-md border border-rd-border p-1.5 text-rd-bright disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-1 tabular-nums">{`${activePage + 1}/${pageCount}`}</span>
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


