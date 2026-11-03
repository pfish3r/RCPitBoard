import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorRaceTiming, buildTimeline, formatCountdown } from '../src/lib/raceday.js';

const start = Date.parse('2026-11-03T12:00:00Z');
function snapshot(status = 'running', seq = 1, elapsed = 0, remainingSeconds = null) {
  return { fetchedAt: new Date(start + elapsed * 1000).toISOString(),
    track: { liveUrl: 'https://test.liverc.com/live/' }, event: { name: 'Club race' },
    current: { roundId: 'Q1', seq, status, lengthSeconds: 300, remainingSeconds } };
}
function timeline(data, timing, elapsed = 0) {
  return buildTimeline({ round: { races: [1, 2, 3, 4].map(num => ({ num, drivers: [],
    status: num < data.current.seq ? 'complete' : num === data.current.seq ? data.current.status : 'pending' })) },
    current: data.current, fetchedAt: data.fetchedAt, timing, now: start + elapsed * 1000,
    cadenceMinutes: 7, viewerRoundIsActive: true });
}

test('all future cards count down every second towards fixed estimated starts', () => {
  const data = snapshot('running', 1, 0, 60);
  const timing = anchorRaceTiming(data);
  const first = timeline(data, timing);
  const later = timeline(data, timing, 31);
  for (const index of [1, 2, 3]) {
    assert.equal(later[index].secondsAhead, first[index].secondsAhead - 31);
    assert.equal(later[index].estimatedStartAt, first[index].estimatedStartAt);
  }
  assert.equal(first[1].secondsAhead, 180);
  assert.equal(first[1].isNext, true);
});

test('refreshes do not restart fallback estimates or a frozen live clock', () => {
  for (const remaining of [null, 180]) {
    const first = snapshot('running', 1, 0, remaining);
    const anchor = anchorRaceTiming(first);
    const refreshed = snapshot('running', 1, 20, remaining);
    const nextAnchor = anchorRaceTiming(refreshed, anchor);
    assert.equal(nextAnchor.at, anchor.at);
    assert.equal(timeline(refreshed, nextAnchor, 20)[1].secondsAhead,
      timeline(first, anchor)[1].secondsAhead - 20);
  }
});

test('the live clock corrects the estimate when it advances', () => {
  const first = anchorRaceTiming(snapshot('running', 1, 0, 180));
  const data = snapshot('running', 1, 20, 10);
  const corrected = anchorRaceTiming(data, first);
  assert.equal(timeline(data, corrected, 20)[1].secondsAhead, 130);
});

test('after completion the staging race is next up without an extra full race duration', () => {
  const running = anchorRaceTiming(snapshot());
  const data = snapshot('pending', 2, 300);
  const staging = anchorRaceTiming(data, running);
  const rows = timeline(data, staging, 300);
  assert.equal(rows[1].isNext, true);
  assert.equal(rows[1].secondsAhead, 120);
  assert.equal(rows[2].secondsAhead, 540);
  const refresh = snapshot('pending', 2, 330);
  assert.equal(timeline(refresh, anchorRaceTiming(refresh, staging), 330)[1].secondsAhead, 90);
  assert.equal(timeline(refresh, staging, 450)[1].secondsAhead, 0);
  assert.equal(formatCountdown(0), 'now');
  assert.equal(formatCountdown(119), '1:59');
});

test('starting a new heat resets its anchor; other rounds have no countdown', () => {
  const old = anchorRaceTiming(snapshot('pending', 2));
  const data = snapshot('running', 2, 20, 299);
  assert.notEqual(anchorRaceTiming(data, old).key, old.key);
  const rows = buildTimeline({ round: { races: [{ drivers: [] }] }, current: data.current,
    fetchedAt: data.fetchedAt, now: start, viewerRoundIsActive: false });
  assert.equal(rows[0].secondsAhead, null);
  assert.equal(rows[0].estimatedStartAt, null);
  assert.equal(rows[0].isNext, false);
});
