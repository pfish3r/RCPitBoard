import { useCallback, useEffect, useRef, useState } from "react";
import useAnnouncementSettings from "@/hooks/useAnnouncementSettings";

export const AUDIO_KEY = "lpr_raceday_audio";

function synth() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

function announce(text) {
  const engine = synth();
  if (!engine || !text) return;
  const utterance = new SpeechSynthesisUtterance(String(text).replace(/\s*\/\s*/g, " of "));
  utterance.rate = 1;
  utterance.pitch = 1;
  engine.speak(utterance);
}

function spokenLead(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes <= 1) return ", any moment now";
  if (minutes < 60) return `, about ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest ? `, about ${hourText} ${rest} minutes` : `, about ${hourText}`;
}

export default function useAudioAnnouncements({ current, timeline, paused = false }) {
  const { settings, updateSetting } = useAnnouncementSettings();
  const [enabled, setEnabled] = useState(() => localStorage.getItem(AUDIO_KEY) !== "off");
  const enabledRef = useRef(enabled);
  const previous = useRef(null);
  enabledRef.current = enabled;

  const toggle = useCallback(() => {
    setEnabled((value) => {
      const next = !value;
      localStorage.setItem(AUDIO_KEY, next ? "on" : "off");
      synth()?.cancel();
      if (next && !paused) announce("Announcements on");
      return next;
    });
  }, [paused]);

  const changeSetting = useCallback((key, value) => {
    updateSetting(key, value);
    if (!value && key !== "heatStartChime") synth()?.cancel();
  }, [updateSetting]);

  useEffect(() => {
    if (paused) synth()?.cancel();
  }, [paused]);

  // Browsers only allow speech once the visitor has touched the page.
  useEffect(() => {
    const prime = () => {
      const engine = synth();
      if (!engine) return;
      const warmUp = new SpeechSynthesisUtterance(" ");
      warmUp.volume = 0;
      engine.speak(warmUp);
    };
    window.addEventListener("pointerdown", prime, { once: true });
    return () => window.removeEventListener("pointerdown", prime);
  }, []);

  useEffect(() => {
    if (!current || !current.seq) return;
    const now = { seq: current.seq, status: current.status };
    const before = previous.current;
    previous.current = now;
    if (paused || !before || !enabledRef.current) return;
    if (before.seq === now.seq && before.status === now.status) return;

    const races = timeline || [];
    const describe = (race) => [race?.className, race?.heat].filter(Boolean).join(", ");
    const spoken = [];

    if (now.seq > before.seq) {
      if (settings.raceFinish) spoken.push(`Race ${before.seq} is finished.`);
      if (settings.nextRace) {
        spoken.push(
          `Next on the line is race ${now.seq}${describe(current) ? `, ${describe(current)}` : ""}.`
        );
      }
    } else if (now.status === "complete" && before.status !== "complete") {
      if (settings.raceFinish) spoken.push(`Race ${now.seq} is finished.`);
      const nextUp = races.find((race) => race.seq === now.seq + 1);
      if (nextUp && settings.nextRace) {
        spoken.push(
          `Next up is race ${nextUp.seq}${describe(nextUp) ? `, ${describe(nextUp)}` : ""}${spokenLead(
            nextUp.minutesAhead
          )}.`
        );
      } else if (!nextUp && settings.roundFinish) {
        spoken.push("That is the last race of the round.");
      }
    } else if (now.status === "running" && before.status !== "running" && settings.raceStart) {
      spoken.push(`Race ${now.seq} is on the track.`);
    }

    if (spoken.length) announce(spoken.join(" "));
  }, [current, timeline, settings, paused]);

  return { enabled, toggle, settings, changeSetting };
}