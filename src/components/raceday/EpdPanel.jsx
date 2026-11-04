import React from "react";
import { normalizeName, prettyName } from "@/lib/raceday";
import DriverName, { clashingShortNames } from "@/components/raceday/DriverName";
import AutoScrollColumn from "@/components/raceday/AutoScrollColumn";

const EPD_GRID = "grid-cols-[1.25rem_1.5rem_minmax(0,1fr)_auto]";

// Projected laps/time ("28/5:08.095") for drivers on track, from live timing.
function paceLabel(pace) {
  const m = String(pace || "").match(/^(\d+)\/(\d+:\d+)/);
  return m ? `${m[1]}L ${m[2]}` : "";
}

export default function EpdPanel({ epd, live, driverKey, scrollSpeed }) {
  const rows = epd?.rows || [];
  if (!rows.length) return null;
  const paceByName = new Map(
    (live?.rows || []).map((r) => [normalizeName(r.name), paceLabel(r.pace)])
  );

  return (
    <section className="epd-panel flex flex-col gap-1.5 lg:min-h-0 lg:h-full">
      <h3 className="font-display text-lg uppercase leading-none tracking-wide text-rd-bright">
        Estimated positions
      </h3>

      <div className="flex items-baseline justify-between gap-2 text-[9px] uppercase tracking-[0.16em] text-rd-faint">
        <span className="truncate text-rd-dim">{epd.className || "EPD"}</span>
        <span className="shrink-0">
          {epd.numHeats ? `Heat ${epd.heatNum}/${epd.numHeats}` : epd.qualType || ""}
        </span>
      </div>

      <div
        className={`grid ${EPD_GRID} gap-1 px-1.5 pb-0.5 text-[9px] uppercase tracking-[0.16em] text-rd-faint`}
      >
        <span>Pos</span>
        <span>Chg</span>
        <span>Driver</span>
        <span className="text-right">Proj.</span>
      </div>

      <AutoScrollColumn
        speed={scrollSpeed}
        pauseAtTop={10000}
        className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-0.5">
        {(() => {
          const clashes = clashingShortNames(rows.map((r) => prettyName(r.name)));
          return rows.map((row) => {
          const mine = Boolean(driverKey) && normalizeName(row.name) === driverKey;
          return (
            <div
              key={`${row.pos}-${row.name}`}
              className={`grid ${EPD_GRID} items-center gap-1 rounded-md px-1.5 py-1 ${
                mine
                  ? "bg-[#c6f24e]/15 text-rd-bright"
                  : row.inRace
                    ? "text-rd-dim"
                    : "text-rd-faint"
              }`}
            >
              <span className="font-mono text-[11px] text-rd-muted">{row.pos}</span>
              <span
                className={`text-[10px] ${
                  row.change < 0 ? "text-rd-acctext" : row.change > 0 ? "text-rd-live" : "text-rd-faint"
                }`}
              >
                {row.change === 0 ? "-" : `${row.change < 0 ? "" : ""}${Math.abs(row.change)}`}
              </span>
              <DriverName name={prettyName(row.name)} clashes={clashes} className="text-[11px]" />
              <span className="whitespace-nowrap text-right font-mono text-[10px] text-rd-muted">
                {paceByName.get(normalizeName(row.name)) || row.result}
              </span>
            </div>
          );
          });
        })()}
        </div>
      </AutoScrollColumn>
    </section>
  );
}
