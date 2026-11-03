import { useCallback, useState } from "react";

export const ANNOUNCEMENT_OPTIONS = [
  { key: "raceStart", label: "Race starts" },
  { key: "raceFinish", label: "Race finishes" },
  { key: "nextRace", label: "Next race / staging" },
  { key: "roundFinish", label: "Round finished" },
  { key: "heatStartChime", label: "Heat-start chime" },
];

const STORAGE_PREFIX = "lpr_raceday_announcement_";

export default function useAnnouncementSettings() {
  const [settings, setSettings] = useState(() => Object.fromEntries(
    ANNOUNCEMENT_OPTIONS.map(({ key }) => [key, localStorage.getItem(`${STORAGE_PREFIX}${key}`) !== "off"])
  ));

  const updateSetting = useCallback((key, enabled) => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, enabled ? "on" : "off");
    setSettings((previous) => ({ ...previous, [key]: enabled }));
  }, []);

  return { settings, updateSetting };
}