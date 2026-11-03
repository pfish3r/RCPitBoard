import React from "react";
import { Minus, Plus } from "lucide-react";
import { MIN_REFRESH_SECONDS, MAX_REFRESH_SECONDS } from "@/lib/trackDefaults";

const STEP = 5;

export default function RefreshRateField({ value, onChange, disabled }) {
  const set = (next) => onChange(Math.min(MAX_REFRESH_SECONDS, Math.max(MIN_REFRESH_SECONDS, next)));
  const buttonClass =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-rd-border bg-rd-surface text-rd-bright transition hover:border-[#c6f24e]/70 disabled:opacity-40";

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rd-muted">
        Data refresh rate
      </span>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          aria-label="Refresh more often"
          onClick={() => set(value - STEP)}
          disabled={disabled || value <= MIN_REFRESH_SECONDS}
          className={buttonClass}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[7rem] text-center font-mono text-sm text-rd-bright">
          Every {value}s
        </span>
        <button
          type="button"
          aria-label="Refresh less often"
          onClick={() => set(value + STEP)}
          disabled={disabled || value >= MAX_REFRESH_SECONDS}
          className={buttonClass}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <span className="mt-1.5 block text-xs text-rd-faint">
        How often the board pulls new timing data ({MIN_REFRESH_SECONDS}–{MAX_REFRESH_SECONDS} seconds). Lower is
        more live.
      </span>
    </div>
  );
}