import React from "react";
import { Check } from "lucide-react";
import { formatClock, formatCountdown, shortTime } from "@/lib/raceday";

export default function RaceRow({ race, isActiveRound }) {
  const done = race.status === "complete";
  const onNow = isActiveRound && race.racesAway === 0 && race.status === "running";
  const isNext = isActiveRound && race.isNext;
  const hasEta = race.minutesAhead !== null && race.minutesAhead !== undefined;

  return (
    <div
      className={`race-card grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-3 py-2.5 transition lg:px-4 ${
        onNow
          ? "border-[#c6f24e]/60 bg-[#c6f24e]/[0.08]"
          : race.mine
            ? "border-[#c6f24e]/40 bg-rd-surface"
            : "border-rd-bordersoft bg-rd-surface2"
      } ${done ? "opacity-50" : ""}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border font-display text-2xl font-semibold lg:h-14 lg:w-14 lg:text-3xl ${
          onNow
            ? "border-[#c6f24e]/60 bg-rd-accent text-rd-ink"
            : done
              ? "border-rd-border text-rd-muted"
              : "border-rd-borderstrong text-rd-bright"
        }`}
      >
        {race.num}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-rd-bright lg:text-lg">{race.className}</p>
          {race.mine && (
            <span className="shrink-0 rounded-full bg-rd-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-rd-ink">
              You
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-rd-faint lg:text-[11px]">
          {race.heat || "Single heat"} · {race.drivers.length} entries
        </p>
      </div>

      <div className="text-right">
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-rd-faint">
            <Check className="h-3 w-3" /> {shortTime(race.completedLabel) || "Done"}
          </span>
        ) : onNow ? (
          <span className="font-display text-2xl font-semibold uppercase leading-none tracking-wide text-rd-acctext lg:text-3xl">
            {race.estimatesUnavailable ? "Last on track" : "On now"}
          </span>
        ) : isNext && hasEta ? (
          <>
            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-rd-bright lg:text-base">
              Next up
            </span>
            <span className="block text-sm text-rd-muted lg:text-base">
              {race.overdue ? "Delayed" : `~${formatCountdown(race.secondsAhead)}`} · {formatClock(race.estimatedStartAt)}
            </span>
          </>
        ) : hasEta ? (
          <>
            <span className="block font-display text-2xl font-semibold leading-none text-rd-bright lg:text-3xl">
              {race.overdue ? "Delayed" : `~${formatCountdown(race.secondsAhead)}`}
            </span>
            <span className="block text-sm text-rd-faint lg:text-base">
              {formatClock(race.estimatedStartAt)}
            </span>
          </>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.14em] text-rd-faint">{race.estimatesUnavailable ? "ETA unavailable" : "Pending"}</span>
        )}
      </div>
    </div>
  );
}
