import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeName, prettyName } from "@/lib/raceday";
import { projectionParts } from "@/lib/estimatedPositions";

export default function EpdPanel({ epd, live, driverKey }) {
  const rows = epd?.rows || [];
  const viewport = useRef(null);
  const [pageSize, setPageSize] = useState(6);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const first = activePage * pageSize;
  const hasRows = rows.length > 0;
  const raceKey = `${epd?.className}|${epd?.heatNum}|${live?.roundCode}|${live?.raceIndex}`;
  const paceByName = new Map((live?.rows || []).map(row => [normalizeName(row.name), row.pace]));

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const height = parseFloat(getComputedStyle(node).getPropertyValue('--epd-row-height')) || 56;
      if (node.clientHeight > 0) setPageSize(Math.max(1, Math.floor(node.clientHeight / height)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasRows]);
  useEffect(() => { setPage(0); }, [raceKey, pageSize]);
  useEffect(() => {
    if (pageCount < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setPage(value => (value + 1) % pageCount), 10000);
    return () => clearInterval(timer);
  }, [pageCount, raceKey, activePage]);

  return (
    <section className="epd-panel dashboard-positions" aria-labelledby="epd-title">
      <h2 id="epd-title" className="board-title">Estimated positions</h2>
      <p className="epd-description">{epd?.className || "Waiting for estimated positions"}{epd?.numHeats ? ` / Heat ${epd.heatNum}/${epd.numHeats}` : epd?.qualType ? ` / ${epd.qualType}` : ""}</p>
      {rows.length ? <>
        <div className="epd-grid epd-column-headings"><span>Pos</span><span>Driver</span><span className="text-center">Change</span><span className="text-right">Projected</span></div>
        <div ref={viewport} className="epd-page-viewport min-h-0 flex-1 overflow-hidden">
          {rows.slice(first, first + pageSize).map(row => {
            const mine = Boolean(driverKey) && normalizeName(row.name) === driverKey;
            const change = Number(row.change) || 0;
            const projection = projectionParts(paceByName.get(normalizeName(row.name)) || row.result);
            return <div key={`${row.pos}-${row.name}`} className={`epd-grid epd-row ${mine ? "is-mine" : ""}`}>
              <span className="font-mono tabular-nums">{row.pos}</span>
              <span className="epd-driver" title={row.name}>{prettyName(row.name)}</span>
              <span className={`text-center font-mono ${change < 0 ? "text-rd-acctext" : change > 0 ? "text-rd-live" : "text-rd-muted"}`}>
                {change < 0 ? `\u25b2 +${Math.abs(change)}` : change > 0 ? `\u25bc -${change}` : "-"}
              </span>
              <span className="epd-projection text-right font-mono tabular-nums" title={[projection.time, projection.note].filter(Boolean).join(' ')}>
                <span className="epd-projection-time">{projection.time}</span>
                {projection.note && <span className="epd-projection-note">{projection.note}</span>}
              </span>
            </div>;
          })}
        </div>
        <nav aria-label="Estimated positions pages" className="flex shrink-0 items-center justify-between gap-2 text-xs text-rd-muted">
          <span>{first + 1}-{Math.min(first + pageSize, rows.length)} of {rows.length}{pageCount > 1 ? ' / Auto 10s' : ''}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous positions" disabled={activePage === 0} onClick={() => setPage(activePage - 1)} className="rounded border border-rd-border p-1 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span>{activePage + 1}/{pageCount}</span>
            <button type="button" aria-label="Later positions" disabled={activePage === pageCount - 1} onClick={() => setPage(activePage + 1)} className="rounded border border-rd-border p-1 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </nav>
      </> : <p className="rounded-lg border border-rd-border p-4 text-sm text-rd-muted">No estimated positions published for this race yet.</p>}
    </section>
  );
}
