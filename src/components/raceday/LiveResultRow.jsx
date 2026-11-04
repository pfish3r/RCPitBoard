import React from "react";
import { prettyName } from "@/lib/raceday";
import DriverName from "@/components/raceday/DriverName";

export const LIVE_RESULT_GRID = "grid-cols-[1.4rem_1.9rem_minmax(0,1fr)_1.4rem_2.8rem_2.6rem_6.25rem]";
export const LIVE_RESULT_GRID_TV = "grid-cols-[1.5rem_1.8rem_minmax(0,1fr)_1.6rem_3.2rem_3rem_5.75rem]";
export const LIVE_RESULT_GRID_WIDE = "grid-cols-[2rem_2.6rem_minmax(0,1fr)_2rem_4rem_3.4rem_7rem]";

function gapLabel(value) {
  const gap = String(value || "");
  if (!gap) return "-";
  const laps = gap.match(/^L(\d+)$/i);
  return laps ? `-${laps[1]}L` : gap;
}

export default function LiveResultRow({ row, mine, wide, clashes, tvMode }) {
  const podium = row.pos >= 1 && row.pos <= 3;
  return (
    <div className={`live-result-row grid ${tvMode ? LIVE_RESULT_GRID_TV : wide ? LIVE_RESULT_GRID_WIDE : LIVE_RESULT_GRID} items-center gap-1.5 rounded-lg border px-1.5 py-1.5 ${
      mine ? "border-[#c6f24e]/45 bg-[#c6f24e]/[0.12]" : podium ? "border-rd-border bg-rd-surface" : "border-rd-bordersoft bg-rd-surface2"
    }`}>
      <span className={`font-mono text-[11px] ${row.pos === 1 ? "text-rd-acctext" : "text-rd-muted"}`}>{row.pos}</span>
      <span className="flex h-5 w-5 items-center justify-center rounded border border-rd-borderstrong font-mono text-[10px] text-rd-dim">{row.carNum || "-"}</span>
      <DriverName name={prettyName(row.name)} clashes={clashes} fullName={wide || tvMode} className="text-[11px] text-rd-bright" />
      <span className="text-right font-mono text-[11px] text-rd-bright">{row.laps || "-"}</span>
      <span className="whitespace-nowrap text-right font-mono text-[10px] text-rd-muted">{row.lapTime || "-"}</span>
      <span className="whitespace-nowrap text-right font-mono text-[10px] text-rd-muted">{gapLabel(row.difference)}</span>
      <span title="Predicted finish: laps / total race time" className="whitespace-nowrap text-right font-mono text-[10px] text-rd-muted">
        {tvMode ? String(row.pace || "-").replace(/(\d+:\d{2})\.\d+/, "$1") : row.pace || "-"}
      </span>
    </div>
  );
}

