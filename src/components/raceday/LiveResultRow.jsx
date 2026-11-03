import React from "react";
import { prettyName } from "@/lib/raceday";
import DriverName from "@/components/raceday/DriverName";

export const LIVE_RESULT_GRID = "grid-cols-[1.4rem_1.9rem_minmax(0,1fr)_1.4rem_2.8rem_2.6rem_6.25rem]";
export const LIVE_RESULT_GRID_WIDE = "grid-cols-[2rem_2.6rem_minmax(0,1fr)_2rem_4rem_3.4rem_7rem]";

function gapLabel(value) {
  const gap = String(value || "");
  if (!gap) return "–";
  const laps = gap.match(/^L(\d+)$/i);
  if (laps) return `-${laps[1]}L`;
  return gap;
}

export default function LiveResultRow({ row, mine, wide, clashes }) {
  const podium = row.pos >= 1 && row.pos <= 3;

  return (
    <div
      className={`grid ${wide ? LIVE_RESULT_GRID_WIDE : LIVE_RESULT_GRID} items-center gap-1.5 rounded-lg border ${wide ? "px-2.5 py-2.5" : "px-1.5 py-1.5"} ${
        mine
          ? "border-[#c6f24e]/45 bg-[#c6f24e]/[0.12]"
          : podium
            ? "border-rd-border bg-rd-surface"
            : "border-rd-bordersoft bg-rd-surface2"
      }`}
    >
      <span
        className={`font-display font-semibold leading-none ${
          wide ? "text-xl" : "text-base"
        } ${row.pos === 1 ? "text-rd-acctext" : "text-rd-bright"}`}
      >
        {row.pos}
      </span>
      <span
        className={`flex items-center justify-center rounded border border-rd-borderstrong font-display text-rd-dim ${
          wide ? "h-7 w-7 text-sm" : "h-5 w-5 text-[11px]"
        }`}
      >
        {row.carNum || "–"}
      </span>
      <DriverName
        name={prettyName(row.name)}
        clashes={clashes}
        className={`text-rd-bright ${wide ? "text-[15px]" : "text-[13px]"}`}
      />
      <span className={`text-right font-mono text-rd-bright ${wide ? "text-sm" : "text-xs"}`}>
        {row.laps || "–"}
      </span>
      <span
        className={`whitespace-nowrap text-right font-mono text-rd-dim ${
          wide ? "text-xs" : "text-[10px]"
        }`}
      >
        {row.lapTime || "–"}
      </span>
      <span
        className={`whitespace-nowrap text-right font-mono text-rd-muted ${
          wide ? "text-xs" : "text-[10px]"
        }`}
      >
        {gapLabel(row.difference)}
      </span>
      <span
        title="Predicted finish: laps / total race time"
        className={`whitespace-nowrap text-right font-mono text-rd-bright ${
          wide ? "text-xs" : "text-[10px]"
        }`}
      >
        {row.pace || "-"}
      </span>
    </div>
  );
}