import React from "react";
import LiveResultRow, { LIVE_RESULT_GRID, LIVE_RESULT_GRID_WIDE, LIVE_RESULT_GRID_TV } from "@/components/raceday/LiveResultRow";
import AutoScrollColumn from "@/components/raceday/AutoScrollColumn";
import { normalizeName, prettyName } from "@/lib/raceday";
import { clashingShortNames } from "@/components/raceday/DriverName";

const STATUS_LABEL = { running: "Racing", staging: "Staging", complete: "Finished" };

export default function LiveResults({ live, driverKey, wide, scrollSpeed, tvMode, stale }) {
  const rows = live?.rows || [];
  const status = live?.status || "";
  const clashes = clashingShortNames(rows.map((row) => prettyName(row.name)));
  const raceLabel =
    live?.raceIndex && live?.raceTotal
      ? `${live.roundCode ? `${live.roundCode} ` : ""}${live.raceIndex}/${live.raceTotal}`
      : "";

  return (
    <section className="live-results flex flex-col gap-2.5 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg uppercase leading-none tracking-wide text-rd-bright">
          Live results
        </h2>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
              status === "running" && !stale
                ? "bg-[#ff4d3d]/15 text-rd-live"
                : "bg-rd-surface text-rd-muted"
            }`}
          >
            {STATUS_LABEL[status] || status}{stale ? " · last known" : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-rd-faint">
        <span className="truncate text-rd-dim">{live?.className || "No race on the line"}</span>
        {raceLabel && <span className="shrink-0">{raceLabel}</span>}
        {live?.timeRemaining && (
          <span className="ml-auto shrink-0 rounded border border-rd-border px-1.5 py-0.5 font-mono text-[11px] tracking-normal text-rd-dim">
            {live.timeRemaining}
          </span>
        )}
      </div>

      {rows.length ? (
        <div className="flex min-h-0 min-w-0 flex-col gap-1 overflow-x-auto lg:flex-1 lg:overflow-hidden">
          <div
            className={`grid min-w-[24rem] ${tvMode ? LIVE_RESULT_GRID_TV : wide ? LIVE_RESULT_GRID_WIDE : LIVE_RESULT_GRID} pb-1 text-[9px] uppercase tracking-[0.1em] text-rd-faint ${
              wide ? "gap-1.5 px-2.5" : "gap-1.5 px-1.5"
            }`}
          >
            <span>Pos</span>
            <span>Num</span>
            <span>Driver</span>
            <span className="text-right">Lap</span>
            <span className="text-right">Last</span>
            <span className="text-right">Gap</span>
            <span className="text-right" title="Predicted laps / total race time">Pred. finish</span>
          </div>
          <AutoScrollColumn
            speed={scrollSpeed}
            pauseAtTop={10000}
            className="min-h-0 min-w-[24rem] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-1"
          >
            <div className="flex flex-col gap-1">
              {rows.map((row) => (
                <LiveResultRow
                  key={`${row.pos}-${row.name}`}
                  row={row}
                  wide={wide}
                  tvMode={tvMode}
                  clashes={clashes}
                  mine={Boolean(driverKey) && normalizeName(row.name) === driverKey}
                />
              ))}
            </div>
          </AutoScrollColumn>
        </div>
      ) : (
        <p className="rounded-xl border border-rd-border bg-rd-surface2 px-3 py-6 text-center text-[10px] uppercase tracking-[0.16em] text-rd-faint">
          No car on the line yet
        </p>
      )}

      <p className="mt-auto text-[9px] uppercase tracking-[0.16em] text-rd-faint">
        Pred. finish = laps / total race time, from live timing
      </p>
    </section>
  );
}