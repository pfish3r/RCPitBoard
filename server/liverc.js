export const TRACK_BASE = "https://lprcoffroad.liverc.com";
export const TRACK_NAME = "Larry's Performance RC Offroad";
export const LIVE_URL = `${TRACK_BASE}/live/`;
export const RESULTS_URL = `${TRACK_BASE}/results/`;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const pageCache = new Map();
const CACHE_TTL_MS = 4000;

export async function fetchPage(url) {
  const hit = pageCache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.html;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(12000),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`Track timing feed responded ${res.status}`);
  const html = await res.text();
  pageCache.set(url, { at: Date.now(), html });
  return html;
}

export function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

export function parseTimeOfDay(text) {
  const m = String(text || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === "pm") hours += 12;
  return hours * 60 + parseInt(m[2], 10);
}

export function parseClockSeconds(label) {
  const m = String(label || "").match(/(\d+):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function normalizeRaceStatus(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return "pending";
  if (t.includes("complete") || t.includes("view results") || t.includes("finished")) return "complete";
  if (t.includes("not yet")) return "pending";
  return "running";
}

export function classifyRaceName(raw) {
  const name = String(raw || "").trim();
  const heatMatch = name.match(/\(([^)]+)\)\s*$/);
  if (heatMatch) {
    return { className: name.slice(0, heatMatch.index).trim(), heat: heatMatch[1].trim() };
  }
  const mainMatch = name.match(/^(.*?)\s+([A-Z])[-\s](Main|Final|Feature)$/i);
  if (mainMatch) {
    const letter = mainMatch[2].toUpperCase();
    const word = mainMatch[3].charAt(0).toUpperCase() + mainMatch[3].slice(1).toLowerCase();
    return { className: mainMatch[1].trim(), heat: `${letter}-${word}` };
  }
  return { className: name, heat: "" };
}

export function parseResultsIndex(html) {
  const trackName = stripTags((html.match(/<h1 class="page-header">([\s\S]*?)<\/h1>/) || [])[1] || "");
  const eventName = stripTags(
    (html.match(/<h3 class="page-header text-nowrap pull-left">([\s\S]*?)<\/h3>/) || [])[1] || ""
  );
  const eventDate = stripTags(
    (html.match(/<h5 class="page-header text-nowrap pull-left">([\s\S]*?)<\/h5>/) || [])[1] || ""
  );

  const rounds = [];
  const seen = new Set();
  const roundRe = /view_heat_sheet&(?:amp;)?id=(\d+)"[^>]*>\s*(?:<i[^>]*><\/i>\s*)?([^<]+)</g;
  let m;
  while ((m = roundRe.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    rounds.push({ id, label: decodeEntities(m[2]) });
  }

  const entryListMatch = html.match(/view_entry_list&(?:amp;)?id=(\d+)/);

  const results = {};
  const sections = [];
  const sectionRe = /<th>([^<]+)<\/th>\s*<th>Time Completed<\/th>/g;
  while ((m = sectionRe.exec(html))) {
    sections.push({ label: decodeEntities(m[1]), index: m.index, end: sectionRe.lastIndex });
  }
  for (let i = 0; i < sections.length; i++) {
    const block = html.slice(sections[i].end, i + 1 < sections.length ? sections[i + 1].index : html.length);
    const list = [];
    const rowRe =
      /<td><a href="[^"]*view_race_result[^"]*"[^>]*>(?:<i[^>]*><\/i>\s*)?([^<]+)<\/a>\s*<\/td>\s*<td>([^<]+)<\/td>/g;
    let r;
    while ((r = rowRe.exec(block))) {
      list.push({ label: decodeEntities(r[1]), completedLabel: decodeEntities(r[2]) });
    }
    results[sections[i].label] = list;
  }

  return {
    trackName,
    eventName,
    eventDate,
    rounds,
    entryListId: entryListMatch ? entryListMatch[1] : null,
    results,
  };
}

export function parseHeatSheet(html) {
  const races = [];
  const marks = [];
  const numRe = /<div class="race_num"[^>]*>(\d+)<\/div>/g;
  let m;
  while ((m = numRe.exec(html))) {
    marks.push({ num: parseInt(m[1], 10), index: m.index, end: numRe.lastIndex });
  }

  for (let i = 0; i < marks.length; i++) {
    const block = html.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].index : html.length);
    const rawName = (block.match(/<span class="class_header">([^<]*)<\/span>/) || [])[1] || "";
    const length = (block.match(/<span class="race_length">Length:\s*([^<]*)</) || [])[1] || "";
    const statusText =
      (block.match(/<span class="race_status">Status:\s*([^<]*)</) || [])[1] ||
      (block.match(/<span class="race_status">([^<]*)</) || [])[1] ||
      "";
    const resultsId = (block.match(/view_race_result&(?:amp;)?id=(\d+)/) || [])[1] || null;
    const classified = classifyRaceName(decodeEntities(rawName));

    const drivers = [];
    const rowRe = /<td>(\d+)<\/td>\s*<td><span class="car_num">([^<]*)<\/span>([^<]*)<\/td>/g;
    let r;
    while ((r = rowRe.exec(block))) {
      drivers.push({
        pos: parseInt(r[1], 10),
        carNum: decodeEntities(r[2]),
        name: decodeEntities(r[3]),
      });
    }

    races.push({
      num: marks[i].num,
      name: decodeEntities(rawName),
      className: classified.className,
      heat: classified.heat,
      length: decodeEntities(length),
      status: normalizeRaceStatus(decodeEntities(statusText)),
      resultsId,
      drivers,
    });
  }

  return { races };
}

// The live scoring page renders its table from the track's live data feed
// (a socket.io session against livedata.liveracemedia.com), so there is no
// server-rendered markup to scrape. We open a short session ourselves and read
// the same packets the page does.
const LIVE_DATA_BASE = "https://livedata.liveracemedia.com/socket.io/1/";
const LIVE_SESSION_MS = 3200;
const LIVE_CACHE_MS = 8000;

let liveCache = { at: 0, data: null };
let epdCache = { at: 0, data: null };

function secondsToClock(value) {
  const total = Number(value);
  if (!Number.isFinite(total)) return "";
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

function socketPackets(text) {
  const packets = [];
  for (const chunk of String(text || "").split("\ufffd")) {
    const at = chunk.indexOf("5:::");
    if (at < 0) continue;
    try {
      packets.push(JSON.parse(chunk.slice(at + 4)));
    } catch {
      // partial packet split across polls — ignore
    }
  }
  return packets;
}

export function buildLive({ race, clock, drivers }) {
  if (!race && !drivers) return null;
  const fields = race ? String(race).split("|") : [];
  const rawName = fields[0] || "";
  const split = rawName.match(/^(.*?)\s*\((.*)\)\s*$/);
  const raceLengthType = fields[24] === "L" ? "L" : "T";
  const clockFields = clock ? String(clock).split("|") : [];
  const remaining = Number.parseFloat(clockFields[1]);
  const elapsed = Number.parseFloat(clockFields[0]);

  const rows = [];
  if (drivers) {
    let parsed = null;
    try {
      parsed = JSON.parse(drivers);
    } catch {
      parsed = null;
    }
    for (const [key, value] of Object.entries(parsed || {})) {
      if (!key.startsWith("p") || !value) continue;
      const parts = String(value).split("|");
      const pos = Number.parseInt(parts[0], 10) || 0;
      const name = (parts[1] || "").trim();
      if (!pos || !name) continue;
      rows.push({
        pos,
        carNum: parts[2] || "",
        name,
        laps: parts[3] || "",
        lapTime: parts[4] || "",
        fastLap: Number(parts[7]) > 0 && Number.isFinite(Number(parts[7])) ? Number(parts[7]).toFixed(3) : "",
        difference: parts[16] && parts[16] !== "0" ? parts[16] : "",
        pace: parts[6] || "",
        elapsed: parts[5] || "",
      });
    }
    rows.sort((a, b) => a.pos - b.pos);
  }

  return {
    status: fields[2] ? fields[2].toLowerCase() : null,
    roundCode: fields[6] || "",
    className: split ? split[1] : rawName,
    heat: split ? split[2] : "",
    raceIndex: fields[4] ? Number.parseInt(fields[4], 10) : null,
    raceTotal: fields[5] ? Number.parseInt(fields[5], 10) : null,
    raceLengthType,
    timeRemaining:
      raceLengthType === "L"
        ? fields[3] || ""
        : Number.isFinite(remaining)
          ? secondsToClock(remaining)
          : "",
    timeElapsed: Number.isFinite(elapsed) ? secondsToClock(elapsed) : "",
    eventName: fields[12] || "",
    rows,
  };
}

async function readLivePackets(liveUrl, userType, ready, sessionMs = LIVE_SESSION_MS) {
  let origin = new URL(LIVE_URL).origin;
  try {
    origin = new URL(liveUrl).origin;
  } catch {
    // keep the default track origin
  }

  const html = await fetchPage(`${origin}/live/scoring/`).catch(() => "");
  const accountId = (String(html).match(/"account_id":"(\d+)"/) || [])[1];
  if (!accountId) return null;

  const headers = {
    "User-Agent": UA,
    Origin: origin,
    "Accept-Language": "en-GB,en;q=0.9",
  };
  const timeout = (ms) => AbortSignal.timeout(ms);

  const handshake = await fetch(`${LIVE_DATA_BASE}?t=${Date.now()}&userType=${userType}`, {
    headers,
    signal: timeout(8000),
  });
  if (!handshake.ok) return null;
  const sid = (await handshake.text()).split(":")[0];
  if (!sid) return null;

  const endpoint = `${LIVE_DATA_BASE}xhr-polling/${sid}?t=`;
  const poll = async () => (await fetch(endpoint + Date.now(), { headers, signal: timeout(7000) })).text();
  const send = (body) =>
    fetch(endpoint + Date.now(), {
      method: "POST",
      headers: { ...headers, "Content-Type": "text/plain;charset=UTF-8" },
      body,
      signal: timeout(5000),
    });

  const packets = [];
  try {
    await poll(); // connect packet — the session must be polled before it accepts emits
    await send(`5:::${JSON.stringify({ name: "joinTrack", args: [`t${accountId}`] })}`);

    const deadline = Date.now() + sessionMs;
    let polls = 0;
    while (Date.now() < deadline && polls < 8 && !ready(packets)) {
      polls += 1;
      for (const packet of socketPackets(await poll().catch(() => ""))) packets.push(packet);
    }
  } catch {
    // fall through with whatever arrived
  } finally {
    send("0::").catch(() => {});
  }

  return packets;
}

export async function fetchLiveScoring(liveUrl = LIVE_URL) {
  if (liveCache.url === liveUrl && liveCache.data && Date.now() - liveCache.at < LIVE_CACHE_MS) return liveCache.data;

  const packets =
    (await readLivePackets(liveUrl, "scoring", (list) => {
      const names = new Set(list.map((packet) => packet?.name));
      return names.has("updateRaceData") && names.has("updateDriverData") && names.has("updateClockData");
    })) || [];

  const state = { race: null, clock: null, drivers: null };
  for (const packet of packets) {
    const value = packet?.args?.[0];
    if (packet?.name === "updateRaceData") state.race = value;
    if (packet?.name === "updateClockData") state.clock = value;
    if (packet?.name === "updateDriverData") state.drivers = value;
  }

  const live = buildLive(state);
  const data = live ? { ...live, receivedAt: new Date().toISOString() } : null;
  if (data) liveCache = { at: Date.now(), data, url: liveUrl };
  return data;
}

function parseEpdResult(result) {
  const text = String(result || "");
  const match = text.match(/^(\d+)\s*\/\s*(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return { laps: -1, seconds: Infinity, dnf: /dnf/i.test(text), ranked: false };
  return {
    laps: parseInt(match[1], 10),
    seconds: parseInt(match[2], 10) * 60 + parseFloat(match[3]),
    dnf: /dnf/i.test(text),
    ranked: true,
  };
}

function epdBetter(candidate, current) {
  if (candidate.ranked !== current.ranked) return candidate.ranked;
  if (candidate.dnf !== current.dnf) return !candidate.dnf;
  if (candidate.laps !== current.laps) return candidate.laps > current.laps;
  if (candidate.seconds !== current.seconds) return candidate.seconds < current.seconds;
  return candidate.inRace && !current.inRace;
}

function buildEpd(header, drivers) {
  const fields = header ? String(header).split("|") : [];
  let parsed = null;
  try {
    parsed = drivers ? JSON.parse(drivers) : null;
  } catch {
    parsed = null;
  }

  const rows = [];
  for (const [key, value] of Object.entries(parsed || {})) {
    if (!key.startsWith("e") || !value) continue;
    const parts = String(value).split("|");
    const pos = Number.parseInt(parts[1], 10) || 0;
    const name = (parts[3] || "").trim();
    if (!pos || !name) continue;
    // The feed lists one entry per driver per heat run, so the same driver can
    // appear several times (and a DNF run can outrank a full one). Keep the best run.
    rows.push({
      pos,
      change: Number.parseInt(parts[2], 10) || 0,
      name,
      result: parts[4] || "",
      inRace: parts[0] === "1",
      driverId: parts[5] || name.toLowerCase(),
      ...parseEpdResult(parts[4]),
    });
  }
  if (!rows.length && !fields[0]) return null;

  const best = new Map();
  for (const row of rows) {
    const current = best.get(row.driverId);
    if (!current || epdBetter(row, current)) best.set(row.driverId, row);
  }
  const unique = [...best.values()].sort((a, b) => {
    if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    if (a.laps !== b.laps) return b.laps - a.laps;
    if (a.seconds !== b.seconds) return a.seconds - b.seconds;
    return a.pos - b.pos;
  });
  unique.forEach((row, index) => {
    row.pos = index + 1;
  });
  rows.length = 0;
  rows.push(...unique);

  return {
    className: fields[0] || "",
    heatNum: fields[1] || "",
    numHeats: fields[2] || "",
    qualType: fields[3] || "",
    rows,
  };
}

// The EPD (estimated position data) panel on the live scoring page reads two
// extra packets from the same feed, subscribed with the "epd" user type.
export async function fetchEstimatedPositions(liveUrl = LIVE_URL) {
  if (epdCache.url === liveUrl && epdCache.data && Date.now() - epdCache.at < LIVE_CACHE_MS) return epdCache.data;

  const packets =
    (await readLivePackets(
      liveUrl,
      "epd",
      (list) => {
        const names = new Set(list.map((packet) => packet?.name));
        return (
          names.has("updateEstimatedPositionDataHeader") && names.has("updateEstimatedPositionDataDriver")
        );
      },
      5000
    )) || [];

  let header = null;
  let drivers = null;
  for (const packet of packets) {
    if (packet?.name === "updateEstimatedPositionDataHeader") header = packet?.args?.[0];
    if (packet?.name === "updateEstimatedPositionDataDriver") drivers = packet?.args?.[0];
  }

  const data = buildEpd(header, drivers);
  if (data) epdCache = { at: Date.now(), data, url: liveUrl };
  return data;
}

export function roundForCode(code, rounds) {
  const normalized = String(code || "").toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;
  if (normalized.startsWith("M")) {
    return rounds.find((r) => /main|final|feature/i.test(r.label)) || null;
  }
  const numberMatch = normalized.match(/(\d+)/);
  const number = numberMatch ? parseInt(numberMatch[1], 10) : null;
  const labelNumber = (label) => {
    const m = String(label).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };
  if (normalized.startsWith("Q")) {
    const quals = rounds.filter((r) => /qualif/i.test(r.label));
    return quals.find((r) => labelNumber(r.label) === number) || quals[quals.length - 1] || null;
  }
  if (normalized.startsWith("P")) {
    const practice = rounds.filter((r) => /practice/i.test(r.label));
    return practice.find((r) => labelNumber(r.label) === number) || practice[practice.length - 1] || null;
  }
  return null;
}

export function sameClass(race, className) {
  if (!race || !className) return false;
  const a = String(race.className || "").toLowerCase().trim();
  const b = String(className || "").toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function medianCadenceMinutes(rounds) {
  const gaps = [];
  for (const round of rounds) {
    const stamps = round.races
      .map((race) => race.completedMinutes)
      .filter((value) => typeof value === "number")
      .sort((a, b) => a - b);
    for (let i = 1; i < stamps.length; i++) {
      const delta = stamps[i] - stamps[i - 1];
      if (delta >= 3 && delta <= 40) gaps.push(delta);
    }
  }
  if (!gaps.length) return 9;
  gaps.sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[middle] : (gaps[middle - 1] + gaps[middle]) / 2;
  return Math.round(median * 10) / 10;
}
