import React from "react";
import LiveResultRow from "@/components/raceday/LiveResultRow";
import { normalizeName, formatCountdown } from "@/lib/raceday";
import { liveResultGroups } from "@/lib/liveResults";

const STATUS_LABEL = { running: "Racing", staging: "Staging", complete: "Finished" };

export default function LiveResults({ live, driverKey, stale, paused, remainingSeconds }) {
  const rows = live?.rows || [];
  const groups = liveResultGroups(rows);
  const status = live?.status || "";
  const raceLabel = [live?.className, live?.heat, live?.roundCode,
    live?.raceIndex ? `Race ${live.raceIndex}${live.raceTotal ? `/${live.raceTotal}` : ""}` : ""].filter(Boolean).join(" / ");
  const clock = !stale && remainingSeconds !== null && remainingSeconds !== undefined
    ? remainingSeconds === 0 ? "0:00" : formatCountdown(remainingSeconds)
    : live?.timeRemaining;

  return (
    <section className="live-results unified-live broadcast-live" aria-labelledby="live-results-title">
      <div className="unified-live-heading">
        <h2 id="live-results-title" className="board-title">Live results</h2>
        <p className="live-race-description" title={raceLabel}>{raceLabel || "Waiting for live timing"}</p>
        <div className="live-race-clock">
          {clock && <span className="font-mono tabular-nums">{clock}{status === "running" ? live?.raceLengthType === "L" ? " laps left" : " remaining" : ""}</span>}
          <span className={stale ? "text-rd-live" : "text-rd-muted"}>{paused ? "Paused" : stale ? "Last known data" : STATUS_LABEL[status] || "Waiting"}</span>
        </div>
      </div>
      <div className="timing-cards" role="list" aria-label="Live timing positions 1 to 10">
        {groups.flat().map(({ position, row }) => <LiveResultRow key={position} position={position} row={row}
          mine={Boolean(driverKey && row) && normalizeName(row.name) === driverKey} />)}
      </div>
      <p className="live-results-note">{rows.length > 10 ? `Showing top 10 of ${rows.length} drivers / ` : !rows.length ? "Waiting for drivers / " : ""}Pace = predicted laps / total race time</p>
    </section>
  );
}
