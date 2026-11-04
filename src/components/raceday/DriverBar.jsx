import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatClock, formatCountdown, normalizeName, prettyName } from "@/lib/raceday";

export default function DriverBar({ drivers, driverKey, myRace, emptyMessage, onSelect, onClear }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return [];
    return drivers.filter((driver) => driver.key.includes(q)).slice(0, 6);
  }, [drivers, query]);

  const choose = (key) => {
    onSelect(key);
    setQuery("");
  };

  const onLine = myRace ? myRace.racesAway !== null && myRace.racesAway <= 0 : false;
  const eta = myRace?.minutesAhead ?? null;

  return (
    <section className="shrink-0 border-t border-rd-border bg-rd-soft px-4 py-3 sm:px-6">
      {!driverKey ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
          <div className="sm:w-48">
            <p className="font-display text-lg uppercase leading-none text-rd-bright lg:text-xl">Find your race</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-rd-faint">
              Type your name
            </p>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rd-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) choose(matches[0].key);
              }}
              placeholder="Your name…"
              aria-label="Find your name"
              className="h-12 w-full rounded-xl border border-rd-border bg-rd-surface pl-12 pr-4 text-lg text-rd-bright placeholder:text-rd-faint focus:border-[#c6f24e]/70 focus:outline-none lg:h-14 lg:text-xl"
            />
          </div>

          {query && !matches.length && (
            <p className="text-sm text-rd-muted">No name matches “{query}”</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rd-accent font-display text-[11px] font-bold uppercase text-rd-ink">
              You
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold uppercase leading-none text-rd-bright lg:text-2xl">
                {prettyName(driverKey)}
              </p>
              <button
                type="button"
                onClick={onClear}
                className="mt-1 text-[10px] uppercase tracking-[0.18em] text-rd-faint transition hover:text-rd-bright"
              >
                Change name
              </button>
            </div>
          </div>

          {myRace ? (
            <>
              <div className="flex items-baseline gap-2 border-rd-border sm:border-l sm:pl-5">
                <span className="font-display text-3xl font-semibold leading-none text-rd-bright lg:text-4xl">
                  {myRace.num}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-rd-faint">
                    Race {myRace.seq} of {myRace.roundTotal} · {myRace.roundLabel}
                  </p>
                  <p className="truncate font-display text-base uppercase leading-tight text-rd-dim lg:text-lg">
                    {myRace.className} {myRace.heat}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-rd-faint">
                    Car #{myRace.myEntry?.carNum || "-"} · {myRace.drivers.length} in race
                  </p>
                </div>
              </div>

              <div className="ml-auto text-right">
                {myRace.estimatesUnavailable ? (
                  <p className="text-sm uppercase tracking-[0.14em] text-rd-muted">Timing unavailable</p>
                ) : onLine ? (
                  <p className="font-display text-2xl font-semibold uppercase leading-none text-rd-acctext lg:text-3xl">
                    Head to the line
                  </p>
                ) : eta !== null ? (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-rd-faint">
                      {myRace.racesAway !== null
                        ? `${myRace.racesAway} ${myRace.racesAway === 1 ? "race" : "races"} away`
                        : "Pit time left"}
                    </p>
                    <p className="font-display text-3xl font-semibold leading-none text-rd-acctext lg:text-4xl">
                      {myRace.overdue ? "Running behind estimate" : `~${formatCountdown(myRace.secondsAhead)}`}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-rd-faint">
                      est. {formatClock(myRace.estimatedStartAt)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs uppercase tracking-[0.18em] text-rd-muted">Round order pending</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-rd-muted">{emptyMessage}</p>
          )}
        </div>
      )}
    </section>
  );
}