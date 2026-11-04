import React from "react";
import { prettyName } from "@/lib/raceday";
import { predictedFinish } from "@/lib/liveResults";

export default function LiveResultRow({ row, position, mine }) {
  return (
    <div role="row" className={`live-top-row live-timing-grid ${mine ? "is-mine" : ""} ${position === 1 && row ? "is-leader" : ""} ${!row ? "is-empty" : ""}`}>
      <span role="cell" className="live-position">{position}</span>
      <span role="cell" className="live-driver" title={row?.name || "No driver in this position"}>{row ? prettyName(row.name) : "-"}</span>
      <span role="cell" className="live-time">{row?.lapTime || "-"}</span>
      <span role="cell" className="live-time" title="Fastest lap">{row?.fastLap || "-"}</span>
      <span role="cell" className="live-time" title="Predicted laps / total race time">{predictedFinish(row?.pace)}</span>
    </div>
  );
}
