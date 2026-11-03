import React from "react";
import { Link } from "react-router-dom";
import { Activity, Radio, RefreshCw, Settings2, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from "@/components/raceday/ThemeToggle";
import AudioToggle from "@/components/raceday/AudioToggle";

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-rd-dim transition";

export default function RaceDayHeader({
  track,
  event,
  current,
  liveUrl,
  resultsUrl,
  showLive,
  onToggleLive,
  audioOn,
  onToggleAudio,
  announcementSettings,
  onAnnouncementSettingChange,
  onRefresh,
  refreshing,
  updatedSeconds,
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rd-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d3d] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff4d3d]" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold uppercase leading-none tracking-tight text-rd-bright lg:text-3xl">
              {track?.name || "RCPitBoard"}
            </h1>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.2em] text-rd-muted lg:text-xs">
              RCPitBoard · {event?.name || "Race day"}
              {event?.date ? ` · ${event.date}` : ""}
            </p>
          </div>
        </div>

        <div className="order-3 flex w-full flex-wrap items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-1">
          {current?.seq > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[#c6f24e]/45 bg-[#c6f24e]/[0.08] px-3 py-1.5">
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-rd-acctext">
                {current.status === "running" ? "On track" : "Staging"}
              </span>
              <span className="font-display text-xl font-semibold leading-none text-rd-bright lg:text-2xl">
                {current.seq}
                <span className="text-rd-faint">/{current.total}</span>
              </span>
              <span className="max-w-[18rem] truncate text-xs text-rd-dim lg:text-sm">
                {current.className}
                {current.heat ? ` · ${current.heat}` : ""}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleLive}
                  aria-pressed={showLive}
                  aria-label="Live results"
                  className={`${iconButton} ${
                    showLive
                      ? "border-[#c6f24e]/60 bg-[#c6f24e]/10 text-rd-acctext"
                      : "border-rd-border hover:border-rd-borderstrong hover:text-rd-bright"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Live results</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Video"
                  className={`${iconButton} border-rd-border hover:border-[#c6f24e]/60 hover:text-rd-bright`}
                >
                  <Video className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Video</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={resultsUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Results"
                  className={`${iconButton} border-rd-border hover:border-rd-borderstrong hover:text-rd-bright`}
                >
                  <Radio className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Results</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <span className="hidden w-16 shrink-0 text-right text-[10px] uppercase tabular-nums tracking-[0.18em] text-rd-faint sm:inline-block">
            {updatedSeconds ?? 0}s ago
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Refresh"
                className={`${iconButton} border-rd-border hover:border-rd-borderstrong hover:text-rd-bright`}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <AudioToggle enabled={audioOn} onToggle={onToggleAudio} settings={announcementSettings} onSettingChange={onAnnouncementSettingChange} />
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin"
                aria-label="Track settings"
                className={`${iconButton} border-rd-border text-rd-faint hover:border-rd-borderstrong hover:text-rd-bright`}
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Track settings</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}