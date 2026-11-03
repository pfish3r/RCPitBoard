import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AnnouncementSettings from "@/components/raceday/AnnouncementSettings";

export default function AudioToggle({ enabled, onToggle, settings, onSettingChange }) {
  return (
    <div className="flex items-center gap-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label="Race announcements"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
            enabled
              ? "border-[#c6f24e]/60 bg-[#c6f24e]/10 text-rd-acctext"
              : "border-rd-border text-rd-faint hover:border-rd-borderstrong hover:text-rd-bright"
          }`}
        >
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? "Announcements on" : "Announcements off"}</TooltipContent>
    </Tooltip>
    <AnnouncementSettings enabled={enabled} settings={settings} onChange={onSettingChange} />
    </div>
  );
}