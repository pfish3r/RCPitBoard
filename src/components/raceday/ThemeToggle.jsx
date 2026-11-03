import React from "react";
import { Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import useTheme from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const light = theme === "light";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={light ? "Switch to dark view" : "Switch to light view"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rd-border text-rd-dim transition hover:border-rd-borderstrong hover:text-rd-bright"
        >
          {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{light ? "Dark view" : "Light view"}</TooltipContent>
    </Tooltip>
  );
}