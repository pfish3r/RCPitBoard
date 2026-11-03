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

export function buildTimeline({ round, current, cadenceMinutes, fetchedAt, now, driverKey, viewerRoundIsActive }) {
  if (!round) return [];
  const races = round.races || [];
  const cadence = cadenceMinutes || 9;
  const seqNow = viewerRoundIsActive && current ? current.seq : null;
  const onTrack = viewerRoundIsActive && seqNow > 0 ? races[seqNow - 1] : null;
  const driftMinutes = fetchedAt ? Math.max(0, (now - new Date(fetchedAt).getTime()) / 60000) : 0;

  let remainingMinutes = 0;
  if (onTrack) {
    const lengthMinutes = (onTrack.lengthSeconds || 300) / 60;
    remainingMinutes =
      onTrack.status === "running" ? Math.max(1, lengthMinutes * 0.45 - driftMinutes) : lengthMinutes;
  }

  const turnaround = 2;

  return races.map((race, index) => {
    const seq = index + 1;
    const mine = driverKey ? race.drivers.some((driver) => normalizeName(driver.name) === driverKey) : false;
    const myEntry = mine ? race.drivers.find((driver) => normalizeName(driver.name) === driverKey) : null;
    let racesAway = null;
    let minutesAhead = null;
    if (seqNow !== null && seqNow > 0) {
      racesAway = seq - seqNow;
      minutesAhead =
        racesAway <= 0 ? 0 : Math.round(remainingMinutes + turnaround + (racesAway - 1) * cadence);
    }
    return { ...race, seq, mine, myEntry, racesAway, minutesAhead };
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