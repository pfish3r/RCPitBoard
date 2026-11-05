import React from "react";
import { prettyName } from "@/lib/raceday";
import { predictedFinish } from "@/lib/liveResults";

export default function LiveResultRow({ row, mine }) {
  return <div role="row" className={`live-table-grid live-table-row ${Number(row.pos) === 1 ? "is-leader" : ""} ${mine ? "is-mine" : ""}`}>
    <span role="cell" className="live-table-position">{row.pos}</span>
    <span role="cell" className="live-table-driver" title={row.name}>{prettyName(row.name)}</span>
    <span role="cell" className="live-table-value">{row.lapTime || "-"}</span>
    <span role="cell" className="live-table-value">{row.fastLap || "-"}</span>
    <span role="cell" className="live-table-value">{row.laps ?? "-"}</span>
    <span role="cell" className="live-table-value live-table-pace" title="Predicted laps / total race time">{predictedFinish(row.pace).replace(/\s+/g, "")}</span>
  </div>;
}
