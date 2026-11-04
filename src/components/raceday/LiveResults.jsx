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
    <section className="live-results unified-live" aria-labelledby="live-results-title">
      <div className="unified-live-heading">
        <h2 id="live-results-title" className="board-title">Live results</h2>
        <p className="live-race-description" title={raceLabel}>{raceLabel || "Waiting for live timing"}</p>
        <div className="live-race-clock">
          {clock && <span className="font-mono tabular-nums">{clock}{status === "running" ? live?.raceLengthType === "L" ? " laps left" : " remaining" : ""}</span>}
          <span className={stale ? "text-rd-live" : "text-rd-muted"}>{paused ? "Paused" : stale ? "Last known data" : STATUS_LABEL[status] || "Waiting"}</span>
        </div>
      </div>
      <div className="live-results-groups">
        {groups.map((group, index) => (
          <div key={index} className="live-results-group" role="table" aria-label={`Live results positions ${index * 5 + 1} to ${index * 5 + 5}`}>
            <p className="live-group-label">Positions {index * 5 + 1}-{index * 5 + 5}</p>
            <div role="rowgroup" className="live-column-headings">
              <div role="row" className="live-timing-grid">
                <span role="columnheader">Pos</span><span role="columnheader">Driver</span>
                <span role="columnheader" className="text-right">Last</span><span role="columnheader" className="text-right">Best</span>
                <span role="columnheader" className="text-right">Pred. finish</span>
              </div>
            </div>
            <div role="rowgroup" className="live-five-rows">
              {group.map(({ position, row }) => <LiveResultRow key={position} position={position} row={row}
                mine={Boolean(driverKey && row) && normalizeName(row.name) === driverKey} />)}
            </div>
          </div>
        ))}
      </div>
      <p className="live-results-note">{rows.length > 10 ? `Showing top 10 of ${rows.length} drivers / ` : !rows.length ? "Waiting for drivers / " : ""}Pred. finish = laps / total race time</p>
    </section>
  );
}
