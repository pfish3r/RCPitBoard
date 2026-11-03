import React, { useId } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ANNOUNCEMENT_OPTIONS } from "@/hooks/useAnnouncementSettings";

export default function AnnouncementSettings({ enabled, settings, onChange }) {
  const id = useId();
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Announcement settings" className="inline-flex h-8 w-6 items-center justify-center rounded-lg border border-rd-border text-rd-muted hover:border-rd-borderstrong hover:text-rd-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-accent">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Announcement settings</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" aria-labelledby={`${id}-title`} className="w-72 max-w-[calc(100vw-2rem)] border-rd-border bg-rd-panel font-body text-rd-text">
        <h3 id={`${id}-title`} className="font-display text-lg uppercase tracking-wide text-rd-bright">Announcements</h3>
        <p className="mt-1 text-xs text-rd-muted">
          {enabled ? "Choose which announcements play." : "Audio is muted. Use the speaker to turn it on."}
        </p>
        <div className="mt-3 divide-y divide-rd-bordersoft">
          {ANNOUNCEMENT_OPTIONS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2.5">
              <label htmlFor={`${id}-${key}`} className="cursor-pointer text-sm text-rd-dim">{label}</label>
              <Switch
                id={`${id}-${key}`}
                checked={settings[key]}
                onCheckedChange={(checked) => onChange(key, checked)}
                className="data-[state=checked]:bg-rd-accent data-[state=unchecked]:bg-rd-borderstrong focus-visible:ring-rd-accent focus-visible:ring-offset-rd-panel [&>span]:bg-rd-ink"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-rd-faint">Saved on this device.</p>
      </PopoverContent>
    </Popover>
  );
}