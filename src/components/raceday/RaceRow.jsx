import React from "react";
import { formatClock, formatCountdown, shortTime } from "@/lib/raceday";

export default function RaceRow({ race, isActiveRound }) {
  const done = race.status === "complete";
  const onNow = isActiveRound && race.racesAway === 0 && race.status === "running";
  const next = isActiveRound && race.isNext;
  const hasEta = race.secondsAhead !== null && race.secondsAhead !== undefined;
  const heat = (race.heat || "Single").replace(/^Heat\s*/i, "");
  const start = done ? shortTime(race.completedLabel) || "Done"
    : onNow ? race.estimatesUnavailable ? "Last known" : "Racing"
    : hasEta ? race.overdue ? "Delayed" : formatClock(race.estimatedStartAt)
    : race.estimatesUnavailable ? "No ETA" : "Pending";
  const countdown = onNow ? "On track" : hasEta ? race.overdue ? "est. passed" : formatCountdown(race.secondsAhead) : "-";
  return <article role="listitem" className={`race-card ${onNow ? "is-running" : ""} ${next ? "is-next" : ""} ${race.mine ? "is-mine" : ""} ${done ? "is-complete" : ""}`}>
    <div className="race-card-number"><strong>{race.num}</strong><span>{onNow ? "On track" : next ? "Next up" : race.mine ? "You" : ""}</span></div>
    <div className="race-card-body">
      <div className="race-card-title"><h3 className="race-card-class" title={race.className}>{race.className}</h3><span className="race-card-heat">Heat {heat}</span></div>
      <dl className="race-card-details">
        <div><dt>Est. start</dt><dd className={`race-card-start ${done || onNow || !hasEta || race.overdue ? "is-status" : ""}`}>{start}</dd></div>
        <div><dt>Starts in</dt><dd className={`race-card-countdown ${onNow || race.overdue ? "is-status" : ""}`}>{done ? "-" : countdown}</dd></div>
      </dl>
    </div>
  </article>;
}
