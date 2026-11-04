import React from "react";
import { formatClock, formatCountdown } from "@/lib/raceday";

export default function RaceSpotlight({ current, timeline, timing, now, health, paused, estimate }) {
  const running = current?.status === "running";
  const next = timeline.find(race => race.isNext);
  const uncertain = !health.estimatesAvailable && !paused;
  const remaining = running && Number.isFinite(timing?.at) ? Math.max(0, Math.ceil((timing.at - now) / 1000)) : null;
  const label = uncertain ? "Last on track" : "On track";
  return (
    <section aria-label="Current and next race" className="race-spotlight grid shrink-0 gap-3 px-4 pt-3 sm:grid-cols-2 sm:px-6">
      <article className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-rd-borderstrong bg-rd-panel px-5 py-4">
        <div className="min-w-0">
          <p className="spotlight-label text-xs font-bold uppercase tracking-[0.18em] text-rd-live">{label}</p>
          <h2 className="mt-1 break-words font-display text-3xl font-semibold uppercase leading-tight text-rd-bright lg:text-4xl">
            {running ? current.className : "Track clear"}
          </h2>
          <p className="mt-1 text-sm text-rd-dim">{running ? `Race ${current.seq} · ${current.heat || "Single heat"}` : current?.status === "complete" ? "Round complete" : "Waiting for the next race"}</p>
        </div>
        {running && <div className="shrink-0 text-right">
          <p className="spotlight-clock font-mono text-4xl font-semibold tabular-nums text-rd-bright lg:text-5xl">{uncertain ? "--:--" : remaining === 0 ? "0:00" : formatCountdown(remaining) || "--:--"}</p>
          <p className="mt-1 text-xs uppercase text-rd-muted">{uncertain ? "Last known data" : paused ? "Paused" : remaining === 0 ? "Finishing" : "Est. remaining"}</p>
        </div>}
      </article>
      <article className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-[#c6f24e]/50 bg-[#c6f24e]/[0.07] px-5 py-4">
        <div className="min-w-0">
          <p className="spotlight-label text-xs font-bold uppercase tracking-[0.18em] text-rd-acctext">Next up</p>
          <h2 className="mt-1 break-words font-display text-3xl font-semibold uppercase leading-tight text-rd-bright lg:text-4xl">{next?.className || "No race queued"}</h2>
          <p className="mt-1 text-sm text-rd-dim">{next ? `Race ${next.num} · ${next.heat || "Single heat"}` : "Check the published race order"}</p>
        </div>
        {next && <div className="shrink-0 text-right">
          <p className="spotlight-clock font-mono text-4xl font-semibold tabular-nums text-rd-acctext lg:text-5xl">{uncertain ? "--:--" : formatCountdown(next.secondsAhead) || "--:--"}</p>
          <p className="mt-1 text-xs text-rd-muted">{uncertain ? "Estimate unavailable" : paused ? "Paused" : next.overdue ? "Running behind estimate" : next.estimatedStartAt ? `Est. ${formatClock(next.estimatedStartAt)}` : "Awaiting timing"}</p>
          {!uncertain && !paused && <p className="mt-1 text-xs text-rd-muted">{estimate?.samples ? `Learned from ${estimate.samples} turnaround${estimate.samples === 1 ? "" : "s"}` : "Learning race turnaround"}</p>}
        </div>}
      </article>
    </section>
  );
}
