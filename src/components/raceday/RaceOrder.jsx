import React from "react";
import RaceRow from "@/components/raceday/RaceRow";
import AutoScrollColumn from "@/components/raceday/AutoScrollColumn";

const PINNED = 2;

export default function RaceOrder({
  timeline,
  roundLabel,
  isActiveRound,
  timingEstimate,
  scrollSpeed,
}) {
  const pinned = timeline.slice(0, PINNED);
  const scrolling = timeline.slice(PINNED);

  return (
    <section className="flex min-h-0 flex-col lg:h-full">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl uppercase leading-none tracking-wide text-rd-bright lg:text-3xl">
          Race order
        </h2>
        <p className="text-[10px] uppercase tracking-[0.18em] text-rd-faint lg:text-[11px]">
          {roundLabel ? `${roundLabel} · ` : ""}
          {timeline.length} {timeline.length === 1 ? "race" : "races"}
          {isActiveRound ? ` · Est. gap ${Math.round((timingEstimate?.turnaroundSeconds ?? 120) / 6) / 10} min${timingEstimate?.samples ? " · learned" : " · learning"}` : " · lineup only"}
        </p>
      </div>

      {timeline.length ? (
        <>
          <div className="relative z-20 grid shrink-0 gap-2 bg-rd-bg pb-2">
            {pinned.map((race) => (
              <RaceRow key={race.seq} race={race} isActiveRound={isActiveRound} />
            ))}
          </div>

          {scrolling.length > 0 && (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 border-t border-rd-borderstrong" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-rd-bg to-transparent" />
              <AutoScrollColumn speed={scrollSpeed}>
                <div className="grid gap-2 pb-1 pt-3">
                  {scrolling.map((race) => (
                    <RaceRow key={race.seq} race={race} isActiveRound={isActiveRound} />
                  ))}
                </div>
              </AutoScrollColumn>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-rd-border bg-rd-panel p-6 text-sm text-rd-muted">
          {isActiveRound
            ? `All races in ${roundLabel || "this round"} are complete.`
            : `No races published for ${roundLabel || "this round"} yet.`}
        </div>
      )}
    </section>
  );
}