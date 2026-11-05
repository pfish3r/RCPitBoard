import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LiveResultRow from "@/components/raceday/LiveResultRow";
import { normalizeName, formatCountdown } from "@/lib/raceday";

const STATUS_LABEL = { running: "Racing", staging: "Staging", complete: "Finished" };

export default function LiveResults({ live, driverKey, stale, paused, remainingSeconds, tvMode = false }) {
  const rows = [...(live?.rows || [])].sort((a, b) => Number(a.pos) - Number(b.pos));
  const viewport = useRef(null);
  const [pageSize, setPageSize] = useState(6);
  const [page, setPage] = useState(0);
  const hasRows = rows.length > 0;
  const raceKey = `${live?.className}|${live?.heat}|${live?.roundCode}|${live?.raceIndex}`;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const first = activePage * pageSize;
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const height = parseFloat(getComputedStyle(node).getPropertyValue('--live-row-height')) || 48;
      if (node.clientHeight > 0) setPageSize(Math.max(1, Math.floor(node.clientHeight / height)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasRows]);
  useEffect(() => { setPage(0); }, [raceKey, pageSize]);
  useEffect(() => {
    if (pageCount < 2 || (!tvMode && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const timer = setInterval(() => setPage(value => (value + 1) % pageCount), 10000);
    return () => clearInterval(timer);
  }, [pageCount, raceKey, activePage, tvMode]);
  const status = live?.status || "";
  const raceLabel = [live?.className, live?.heat, live?.roundCode,
    live?.raceIndex ? `Race ${live.raceIndex}${live.raceTotal ? `/${live.raceTotal}` : ""}` : ""].filter(Boolean).join(" / ");
  const clock = !stale && remainingSeconds !== null && remainingSeconds !== undefined
    ? remainingSeconds === 0 ? "0:00" : formatCountdown(remainingSeconds) : live?.timeRemaining;

  return <section className="live-table-panel" aria-labelledby="live-results-title">
    <div className="live-table-heading">
      <h2 id="live-results-title" className="board-title">Live results</h2>
      <div className="live-table-clock"><strong>{clock || "--:--"}</strong><span>{paused ? "Paused" : stale ? "Last known data" : STATUS_LABEL[status] || "Waiting"}</span></div>
    </div>
    <p className="epd-description" title={raceLabel}>{raceLabel || "Waiting for live timing"}</p>
    {hasRows ? <>
      <div className="live-table" role="table" aria-label="Live race results">
        <div role="row" className="live-table-grid live-table-columns"><span role="columnheader">Pos</span><span role="columnheader">Driver</span><span role="columnheader">Last</span><span role="columnheader">Best</span><span role="columnheader">Laps</span><span role="columnheader">Pace</span></div>
        <div ref={viewport} role="rowgroup" className="live-table-viewport">
          {rows.slice(first, first + pageSize).map(row => <LiveResultRow key={`${row.pos}-${row.name}`} row={row} mine={Boolean(driverKey) && normalizeName(row.name) === driverKey} />)}
        </div>
      </div>
      <nav aria-label="Live results pages" className="panel-page-controls">
        <span>{first + 1}-{Math.min(first + pageSize, rows.length)} of {rows.length}{pageCount > 1 ? " / Auto 10s" : ""}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous drivers" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}><ChevronLeft className="h-4 w-4" /></button>
          <span>{activePage + 1}/{pageCount}</span>
          <button type="button" aria-label="Later drivers" disabled={activePage === pageCount - 1} onClick={() => setPage(activePage + 1)}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </nav>
    </> : <p className="p-4 text-sm text-rd-muted">Waiting for drivers</p>}
    <p className="live-table-note">Pace = predicted laps / total race time</p>
  </section>;
}
