import React from "react";
import { prettyName } from "@/lib/raceday";
import { predictedFinish } from "@/lib/liveResults";

export default function LiveResultRow({ row, position, mine }) {
  return (
    <article role="listitem" aria-label={`Position ${position}: ${row ? prettyName(row.name) : "No driver"}`}
      className={`timing-card ${mine ? "is-mine" : ""} ${position === 1 && row ? "is-leader" : ""} ${!row ? "is-empty" : ""}`}>
      <div className="timing-card-rank" aria-hidden="true">{position}</div>
      <div className="timing-card-body">
        <h3 className="timing-card-name" title={row?.name}>{row ? prettyName(row.name) : "Awaiting driver"}</h3>
        <dl className="timing-card-stats">
          <div className="timing-card-stat-line">
            <div><dt>Last</dt><dd>{row?.lapTime || "-"}</dd></div>
            <div><dt>Best</dt><dd>{row?.fastLap || "-"}</dd></div>
          </div>
          <div className="timing-card-stat-line timing-card-pace-line">
            <div><dt>Laps</dt><dd>{row?.laps ?? "-"}</dd></div>
            <div title="Predicted laps / total race time"><dt>Pace</dt><dd>{predictedFinish(row?.pace).replace(/\s+/g, "")}</dd></div>
          </div>
        </dl>
      </div>
    </article>
  );
}
