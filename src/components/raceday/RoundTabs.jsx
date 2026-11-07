import React from "react";
import { shortRoundLabel } from "@/lib/roundLabels";

export default function RoundTabs({ rounds, activeRoundId, value, onChange }) {
  if (!rounds?.length) return null;

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
      {rounds.map((round) => {
        const selected = round.id === value;
        const live = round.id === activeRoundId;
        const done = round.races.length > 0 && round.races.every((race) => race.status === "complete");
        return (
          <button
            key={round.id}
            type="button"
            title={round.label}
            aria-label={`${round.label} / ${live ? "Live" : done ? "Done" : "Next"}`}
            aria-pressed={selected}
            onClick={() => onChange(round.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition lg:text-sm ${
              selected
                ? "border-[#c6f24e]/60 bg-[#c6f24e]/10 text-rd-bright"
                : "border-rd-border bg-rd-surface2 text-rd-muted hover:border-rd-borderstrong hover:text-rd-bright"
            }`}
          >
            <span className="whitespace-nowrap">{shortRoundLabel(round.label)}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                live
                  ? "bg-[#ff4d3d]/15 text-rd-live"
                  : done
                    ? "bg-rd-surface text-rd-faint"
                    : "bg-rd-surface text-rd-muted"
              }`}
            >
              {live ? "Live" : done ? "Done" : "Next"}
            </span>
          </button>
        );
      })}
    </div>
  );
}