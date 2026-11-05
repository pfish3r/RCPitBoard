import React from "react";
import { formatClock, formatCountdown, shortTime } from "@/lib/raceday";

export default function RaceRow({ race, isActiveRound }) {
  const done = race.status === "complete";
  const onNow = isActiveRound && race.racesAway === 0 && race.status === "running";
  const next = isActiveRound && race.isNext;
  const hasEta = race.secondsAhead !== null && race.secondsAhead !== undefined;
  const heat = (race.heat || "Single").replace(/^Heat\s*/i, "");
  const status = done ? "Done" : onNow ? "On track" : next ? "Next" : "";

  return (
    <div role="row" className={`race-order-row race-order-grid border-b border-rd-bordersoft px-2 ${
      onNow || next ? "bg-[#c6f24e]/[0.09]" : race.mine ? "bg-rd-surface" : ""
    } ${done ? "opacity-50" : ""}`}>
      <div role="cell" className="flex flex-col items-start justify-center">
        <span className={`font-display text-2xl font-semibold leading-none ${onNow || next || race.mine ? "text-rd-acctext" : "text-rd-bright"}`}>{race.num}</span>
        {status && <span className="mt-0.5 text-[8px] font-bold uppercase leading-none text-rd-muted">{status}</span>}
      </div>
      <div role="cell" className="min-w-0" title={`${race.className} / ${race.heat || "Single heat"} / ${race.drivers.length} entries`}>
        <p className="race-order-class line-clamp-2 text-sm font-medium leading-tight text-rd-bright">
          {race.mine && <span className="mr-1 rounded bg-rd-accent px-1 text-[9px] font-bold uppercase text-rd-ink">You</span>}
          {race.className}
        </p>
      </div>
      <span role="cell" className="truncate text-xs text-rd-dim" title={race.heat}>{heat}</span>
      <div role="cell" className="text-right tabular-nums">
        {done ? <span className="text-xs text-rd-muted">{shortTime(race.completedLabel) || "Done"}</span>
          : onNow ? <span className="text-xs font-semibold text-rd-acctext">{race.estimatesUnavailable ? "Last known" : "Racing"}</span>
          : hasEta ? <>
            <span className="race-start-time block font-mono text-sm font-semibold text-rd-bright">{race.overdue ? "Delayed" : formatClock(race.estimatedStartAt)}</span>
            <span className="race-start-countdown block font-mono text-[10px] leading-tight text-rd-muted">{race.overdue ? "est. passed" : `~${formatCountdown(race.secondsAhead)}`}</span>
          </> : <span className="text-[10px] text-rd-muted">{race.estimatesUnavailable ? "No ETA" : "Pending"}</span>}
      </div>
    </div>
  );
}

