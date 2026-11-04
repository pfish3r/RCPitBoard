import React from "react";
import { normalizeName, prettyName } from "@/lib/raceday";
import AutoScrollColumn from "@/components/raceday/AutoScrollColumn";

function paceLabel(pace) {
  const match = String(pace || "").match(/^(\d+)\s*\/\s*(\d+:\d+)/);
  return match ? `${match[1]} / ${match[2]}` : "";
}

export default function EpdPanel({ epd, live, driverKey, scrollSpeed }) {
  const rows = epd?.rows || [];
  const paceByName = new Map((live?.rows || []).map(row => [normalizeName(row.name), paceLabel(row.pace)]));
  return (
    <section className="epd-panel dashboard-positions" aria-labelledby="epd-title">
      <h2 id="epd-title" className="board-title">Estimated positions</h2>
      <p className="epd-description">{epd?.className || "Waiting for estimated positions"}{epd?.numHeats ? ` / Heat ${epd.heatNum}/${epd.numHeats}` : epd?.qualType ? ` / ${epd.qualType}` : ""}</p>
      {rows.length ? <>
        <div className="epd-grid epd-column-headings"><span>Pos</span><span>Driver</span><span className="text-center">Change</span><span className="text-right">Projected</span></div>
        <AutoScrollColumn speed={scrollSpeed} pauseAtTop={10000}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="epd-rows">
            {rows.map(row => {
              const mine = Boolean(driverKey) && normalizeName(row.name) === driverKey;
              const change = Number(row.change) || 0;
              return <div key={`${row.pos}-${row.name}`} className={`epd-grid epd-row ${mine ? "is-mine" : ""}`}>
                <span className="font-mono tabular-nums">{row.pos}</span>
                <span className="epd-driver" title={row.name}>{prettyName(row.name)}</span>
                <span className={`text-center font-mono ${change < 0 ? "text-rd-acctext" : change > 0 ? "text-rd-live" : "text-rd-muted"}`}>
                  {change < 0 ? `\u25b2 +${Math.abs(change)}` : change > 0 ? `\u25bc -${change}` : "-"}
                </span>
                <span className="text-right font-mono tabular-nums whitespace-nowrap">{paceByName.get(normalizeName(row.name)) || row.result || "-"}</span>
              </div>;
            })}
          </div>
        </AutoScrollColumn>
      </> : <p className="rounded-lg border border-rd-border p-4 text-sm text-rd-muted">No estimated positions published for this race yet.</p>}
    </section>
  );
}
