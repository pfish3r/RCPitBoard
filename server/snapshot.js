import {
  TRACK_NAME,
  LIVE_URL,
  RESULTS_URL,
  fetchPage,
  parseResultsIndex,
  parseHeatSheet,
  fetchLiveScoring,
  fetchEstimatedPositions,
  parseTimeOfDay,
  parseClockSeconds,
  medianCadenceMinutes,
  sameClass,
  roundForCode,
} from "./liverc.js";

const MAX_ROUNDS = 8;
const DEFAULT_SCROLL_SPEED = 16;

function raceNumberFromLabel(label) {
  const m = String(label || "").match(/Race\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function roundRank(label) {
  const text = String(label || "").toLowerCase();
  const num = parseInt((text.match(/(\d+)/) || [])[1] || "0", 10);
  if (text.includes("practice")) return 10 + num;
  if (text.includes("qualif")) return 100 + num;
  if (text.includes("main") || text.includes("final") || text.includes("feature")) return 1000 + num;
  return 500 + num;
}

function driverKey(name) {
  return String(name || "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// The live feed keeps a driver's previous-race totals until they complete their
// first lap of the new one, which shows impossible lap counts beside the cars
// actually racing. Keep only the drivers entered in the race on the line.
function liveForRace(live, race) {
  // A driver's other car can linger in the feed with old totals, so match the
  // car number too when the heat sheet has one.
  const entered = new Map();
  const sheetNameByCar = new Map();
  for (const driver of race?.drivers || []) {
    const key = driverKey(driver.name);
    const car = String(driver.carNum || "").trim();
    if (key) entered.set(key, car);
    if (car) sheetNameByCar.set(car, driver.name);
  }
  // Until timing loads the next race, the feed still holds the previous one —
  // show it as it is rather than filtering it against the wrong heat sheet.
  if (!live || !entered.size) return live;
  // A driver entered under a nickname (e.g. "FUZZER") shows in timing under
  // their real name, so fall back to the car number for names the feed lacks.
  const feedKeys = new Set((live.rows || []).map((row) => driverKey(row.name)));
  const unmatchedCars = new Set(
    [...entered].filter(([key, car]) => car && !feedKeys.has(key)).map(([, car]) => car)
  );
  const rows = (live.rows || [])
    .filter((row) => {
      const key = driverKey(row.name);
      if (!entered.has(key)) return unmatchedCars.has(String(row.carNum || "").trim());
      const car = entered.get(key);
      const rowCar = String(row.carNum || "").trim();
      return !car || !rowCar || car === rowCar;
    })
    .map((row, index) => {
      // Show car-matched drivers by their heat sheet name so it lines up with EPD.
      const sheetName = entered.has(driverKey(row.name))
        ? row.name
        : sheetNameByCar.get(String(row.carNum || "").trim()) || row.name;
      return { ...row, name: sheetName, pos: index + 1 };
    });
  return { ...live, rows };
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function resultsBaseOf(url) {
  try {
    return `${new URL(url).origin}/results/`;
  } catch {
    return RESULTS_URL;
  }
}

export default async function (saved) {
  try {
    const resultsUrl = normalizeUrl(saved?.results_url) || RESULTS_URL;
    const liveUrl = normalizeUrl(saved?.live_url) || LIVE_URL;
    const sheetBase = resultsBaseOf(resultsUrl);

    const liveRequest = fetchLiveScoring(liveUrl).catch(() => null);
    const epdRequest = fetchEstimatedPositions(liveUrl).catch(() => null);

    const indexHtml = await fetchPage(resultsUrl);
    const index = parseResultsIndex(indexHtml);

    const sheetTargets = index.rounds.slice(0, MAX_ROUNDS);
    const sheetHtmls = await Promise.all(
      sheetTargets.map((round) =>
        fetchPage(`${sheetBase}?p=view_heat_sheet&id=${round.id}`).catch(() => "")
      )
    );

    const rounds = sheetTargets
      .map((round, i) => {
        const sheet = sheetHtmls[i] ? parseHeatSheet(sheetHtmls[i]) : { races: [] };
        const completed = {};
        for (const entry of index.results[round.label] || []) {
          const num = raceNumberFromLabel(entry.label);
          if (num) {
            completed[num] = {
              completedLabel: entry.completedLabel,
              completedMinutes: parseTimeOfDay(entry.completedLabel),
            };
          }
        }
        const races = sheet.races.map((race) => {
          const done = completed[race.num];
          return {
            num: race.num,
            className: race.className,
            heat: race.heat,
            length: race.length,
            lengthSeconds: parseClockSeconds(race.length),
            status: race.status,
            completedLabel: done ? done.completedLabel : null,
            completedMinutes: done ? done.completedMinutes : null,
            drivers: race.drivers,
          };
        });
        return { id: round.id, label: round.label, races };
      })
      .sort((a, b) => roundRank(a.label) - roundRank(b.label));

    const live = await liveRequest;
    const epd = await epdRequest;

    // The live feed runs ahead of the results page. When it is racing a heat
    // we can place, trust it: that heat takes the feed's status and every
    // earlier heat in the round has already been run.
    const feedRound = live ? roundForCode(live.roundCode, rounds) : null;
    const byIndex = feedRound && live.raceIndex ? feedRound.races[live.raceIndex - 1] : null;
    const feedHeat = byIndex && sameClass(live, byIndex.className) ? byIndex : null;
    if (feedHeat && (live.status === "running" || live.status === "complete")) {
      for (const race of feedRound.races.slice(0, live.raceIndex - 1)) {
        if (race.status !== "complete") race.status = "complete";
      }
      feedHeat.status = live.status;
    }

    const activeRound =
      rounds.find((round) => round.races.some((race) => race.status === "running")) ||
      rounds.find((round) => round.races.some((race) => race.status === "pending")) ||
      rounds[rounds.length - 1] ||
      null;

    let currentSeq = 0;
    let currentStatus = null;
    if (activeRound && activeRound.races.length) {
      const races = activeRound.races;
      const runningIndex = races.findIndex((race) => race.status === "running");
      const pendingIndex = races.findIndex((race) => race.status === "pending");
      if (runningIndex >= 0) {
        currentSeq = runningIndex + 1;
        currentStatus = "running";
      } else if (pendingIndex >= 0) {
        currentSeq = pendingIndex + 1;
        currentStatus = "pending";
      } else {
        currentSeq = races.length;
        currentStatus = "complete";
      }
    }

    const currentRace = activeRound && currentSeq > 0 ? activeRound.races[currentSeq - 1] : null;

    // The projection feed covers one class at a time. If it still holds a class
    // that is neither on the line nor the next race's, drop it rather than show
    // the wrong field.
    // Filter the feed against the heat sheet of the race it is actually running,
    // which can be ahead of the results page.
    const feedRace = feedHeat || (sameClass(live, currentRace?.className) ? currentRace : null);
    const liveRace = liveForRace(live, feedRace);
    const liveClass = liveRace?.className || "";
    const raceClass = currentRace ? currentRace.className : "";
    const epdForClass = epd && (sameClass(epd, liveClass) || sameClass(epd, raceClass)) ? epd : null;

    return Response.json({
      fetchedAt: new Date().toISOString(),
      track: {
        name: index.trackName || TRACK_NAME,
        liveUrl,
        resultsUrl,
        scrollSpeed: Number(saved?.scroll_speed) || DEFAULT_SCROLL_SPEED,
        refreshSeconds: Number(saved?.refresh_seconds) || 20,
      },
      event: { name: index.eventName, date: index.eventDate },
      rounds,
      activeRoundId: activeRound ? activeRound.id : null,
      current: {
        roundId: activeRound ? activeRound.id : null,
        roundLabel: activeRound ? activeRound.label : null,
        seq: currentSeq,
        total: activeRound ? activeRound.races.length : 0,
        status: currentStatus,
        className: currentRace ? currentRace.className : null,
        heat: currentRace ? currentRace.heat : "",
        lengthSeconds: currentRace ? currentRace.lengthSeconds : null,
        onTrack: currentRace ? currentRace.drivers : [],
      },
      cadenceMinutes: medianCadenceMinutes(rounds),
      live: liveRace,
      epd: epdForClass,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}