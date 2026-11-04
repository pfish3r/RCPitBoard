export const DRIVER_KEY = "lpr_raceday_driver";
export const LIVE_PANEL_KEY = "lpr_raceday_live_panel";

export function normalizeName(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
}

export function prettyName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function collectDrivers(rounds) {
  const map = new Map();
  (rounds || []).forEach((round) => {
    (round.races || []).forEach((race) => {
      (race.drivers || []).forEach((driver) => {
        const key = normalizeName(driver.name);
        if (!key) return;
        const entry = map.get(key) || { key, name: prettyName(driver.name), classes: new Set() };
        entry.classes.add(race.className);
        map.set(key, entry);
      });
    });
  });
  return [...map.values()]
    .map((driver) => ({ key: driver.key, name: driver.name, classes: [...driver.classes] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Keep fallback estimates anchored to a race/status change, rather than
// starting the same wait again every time a new snapshot arrives.
export function anchorRaceTiming(snapshot, previous) {
  const current = snapshot?.current;
  if (!current?.seq) return null;
  const observedAt = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(observedAt)) return null;
  const key = JSON.stringify([snapshot.track?.liveUrl, snapshot.event?.name,
    snapshot.event?.date, current.roundId, current.seq, current.status]);
  const pauseOffset = snapshot.board?.totalPausedMs || 0;
  if (previous?.key === key) previous = {
    ...previous, at: previous.at + pauseOffset - (previous.pauseOffset || 0), pauseOffset,
  };
  const remaining = current.remainingSeconds;
  if (current.status === "running" && typeof remaining === "number" && Number.isFinite(remaining)) {
    if (previous?.key === key && previous.remainingSeconds === remaining) return previous;
    return { key, at: observedAt + Math.max(0, remaining) * 1000, remainingSeconds: remaining, pauseOffset };
  }
  if (previous?.key === key) return previous;
  const seconds = current.status === "running" ? (current.lengthSeconds || 300) :
    current.status === "pending" ? 120 : 0;
  return { key, at: observedAt + seconds * 1000, pauseOffset };
}

export function buildTimeline({ round, current, cadenceMinutes, fetchedAt, timing, now, driverKey, viewerRoundIsActive }) {
  if (!round) return [];
  const races = round.races || [];
  const cadence = cadenceMinutes || 9;
  const seqNow = viewerRoundIsActive && current ? current.seq : null;
  const reference = timing?.at ?? anchorRaceTiming({ current, fetchedAt })?.at;
  const running = current?.status === "running";

  return races.map((race, index) => {
    const seq = index + 1;
    const mine = driverKey ? race.drivers.some((driver) => normalizeName(driver.name) === driverKey) : false;
    const myEntry = mine ? race.drivers.find((driver) => normalizeName(driver.name) === driverKey) : null;
    let racesAway = null;
    let minutesAhead = null;
    let secondsAhead = null;
    let estimatedStartAt = null;
    if (seqNow !== null && seqNow > 0) {
      racesAway = seq - seqNow;
      if (Number.isFinite(reference)) {
        // A pending current race is the next race to start, not a full race
        // still to run. A running race needs only its remaining time plus the gap.
        estimatedStartAt = running
          ? racesAway <= 0 ? null : reference + 120000 + (racesAway - 1) * cadence * 60000
          : reference + Math.max(0, racesAway) * cadence * 60000;
        secondsAhead = estimatedStartAt === null ? 0 : Math.max(0, Math.ceil((estimatedStartAt - now) / 1000));
        minutesAhead = Math.ceil(secondsAhead / 60);
      }
    }
    const isNext = viewerRoundIsActive && race.status !== "complete" && racesAway === (running ? 1 : 0);
    return { ...race, seq, mine, myEntry, racesAway, minutesAhead, secondsAhead, estimatedStartAt, isNext };
  });
}

export function nextRaceForDriver(timeline, roundLabel) {
  const mine = (timeline || []).filter((race) => race.mine);
  const next = mine.find((race) =>
    race.racesAway !== null ? race.racesAway >= 0 : race.status !== "complete"
  );
  if (!next) return null;
  return { ...next, roundLabel: roundLabel || "", roundTotal: (timeline || []).length };
}

export function isFinalsRound(label) {
  return /main|final|feature/i.test(String(label || ""));
}

export function formatClock(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function shortTime(label) {
  const match = String(label || "").match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

export function formatLead(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes <= 0) return "now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatCountdown(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const total = Math.max(0, Math.ceil(seconds));
  if (!total) return "now";
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
