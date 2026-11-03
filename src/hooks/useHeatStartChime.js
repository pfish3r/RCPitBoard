import { useEffect, useRef } from "react";

let context = null;

// Three rising beeps, loud enough to hear across the pits.
function playChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  context = context || new AudioCtx();
  if (context.state === "suspended") context.resume();
  [660, 880, 1100].forEach((freq, i) => {
    const start = context.currentTime + i * 0.28;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });
}

/** Chimes when the live timing feed starts racing a new heat. */
export default function useHeatStartChime({ live, enabled }) {
  const previous = useRef(null);

  // Browsers only allow sound once the visitor has touched the page.
  useEffect(() => {
    const unlock = () => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      context = context || new AudioCtx();
      context.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!live) return;
    const key = `${live.roundCode}|${live.raceIndex}|${live.className}`;
    const running = live.status === "running";
    const before = previous.current;
    previous.current = { key, running };
    if (!before || !enabled || !running) return;
    if (before.key !== key || !before.running) playChime();
  }, [live, enabled]);
}