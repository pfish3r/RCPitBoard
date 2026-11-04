import test from 'node:test';
import assert from 'node:assert/strict';
import { observeRaceTiming, raceEstimate } from '../server/race-estimates.js';
import { feedHealth, timingActivity } from '../src/lib/feedHealth.js';
import { anchorRaceTiming, buildTimeline } from '../src/lib/raceday.js';
const base = Date.parse('2026-11-04T12:00:00Z');
const sample = (seconds, seq, remainingSeconds, status = 'running', name = 'Club race') => ({
  fetchedAt: new Date(base + seconds * 1000).toISOString(),
  track: { liveUrl: 'https://potteries.liverc.com/live/', refreshSeconds: 20 }, event: {name},
  feed: {liveConnected: true, liveReceivedAt: new Date(base + seconds * 1000).toISOString(), resultsComplete: true},
  current: {roundId: 'Q1', seq, remainingSeconds, lengthSeconds: 300, status},
  live: { status, raceIndex: seq, timeRemaining: String(remainingSeconds), rows: [] },
});

test('learns a shared median turnaround, keeps it across rounds and resets for a new meeting', () => {
  let model = observeRaceTiming(null, sample(0, 1, 30));
  model = observeRaceTiming(model, sample(40, 2, null, 'pending'));
  const staging = raceEstimate(model, sample(40, 2, null, 'pending'));
  assert.equal(staging.stagingStartAt, base + 150000);
  model = observeRaceTiming(model, sample(100, 2, 290)); // race 2 began at 90, gap = 60
  assert.equal(raceEstimate(model, sample(100, 2, 290)).turnaroundSeconds, 60);
  model = observeRaceTiming(model, sample(350, 2, 40));
  model = observeRaceTiming(model, sample(400, 3, null, 'pending'));
  model = observeRaceTiming(model, sample(490, 3, 290)); // began at 480, gap = 90
  assert.equal(raceEstimate(model, sample(490, 3, 290)).turnaroundSeconds, 75);
  assert.equal(raceEstimate(model, sample(490, 3, 290)).samples, 2);
  const nextRound = sample(500, 1, 290); nextRound.current.roundId = 'Q2';
  model = observeRaceTiming(model, nextRound);
  assert.equal(model.gaps.length, 2);
  model = observeRaceTiming(model, sample(600, 1, 290, 'running', 'New meeting'));
  assert.equal(raceEstimate(model, sample(600, 1, 290)).turnaroundSeconds, 120);
  assert.equal(model.gaps.length, 0);
});

test('does not train on pauses, skipped races, outages or long breaks', () => {
  for (const scenario of ['pause', 'skipped', 'outage', 'break']) {
    let model = observeRaceTiming(null, sample(0, 1, 30));
    if (scenario === 'outage') model = observeRaceTiming(model, {...sample(40, 2, null),feed:{liveConnected:false}});
    const next = sample(scenario === 'break' ? 800 : 100, scenario === 'skipped' ? 3 : 2, 290);
    model = observeRaceTiming(model, next, ['pause','outage'].includes(scenario));
    assert.equal(model.gaps.length, 0, scenario);
  }
});

test('uses each upcoming race duration and learned gap, and hides unsafe estimates', () => {
  const data = sample(0, 1, 30);
  const round = {races: [300,180,420,300].map((lengthSeconds,i) => ({num:i+1,lengthSeconds,drivers:[],status:i?'pending':'running'}))};
  const options = {round,current:data.current,fetchedAt:data.fetchedAt,timing:anchorRaceTiming(data),
    now:base,viewerRoundIsActive:true,timingEstimate:{turnaroundSeconds:60}};
  const rows = buildTimeline(options);
  assert.equal(rows[1].secondsAhead,90);
  assert.equal(rows[2].secondsAhead,330);
  assert.equal(rows[3].secondsAhead,810);
  assert.ok(buildTimeline({...options,now:base+200000})[1].overdue);
  for (const row of buildTimeline({...options,estimatesAvailable:false})) {
    assert.equal(row.secondsAhead,null);
    assert.equal(row.estimatedStartAt,null);
  }
});

test('detects upstream failures even when the results page succeeds, and recovers on fresh timing', () => {
  const data = sample(0,1,30); data.activity = timingActivity(data);
  assert.equal(feedHealth(data,null,base+20000).state,'healthy');
  assert.equal(feedHealth({...data,feed:{...data.feed,liveConnected:false}},null,base+20000).state,'disconnected');
  assert.equal(feedHealth(data,'Network failed',base+20000).estimatesAvailable,false);
  assert.equal(feedHealth(data,null,base+61000).state,'stale');
  const frozen = sample(100,1,30); frozen.activity = timingActivity(frozen,data.activity);
  assert.equal(feedHealth(frozen,null,base+100000).state,'stale');
  const fresh = sample(120,1,10); fresh.activity = timingActivity(fresh,frozen.activity);
  assert.equal(feedHealth(fresh,null,base+120000).state,'healthy');
  assert.equal(feedHealth({...fresh,feed:{...fresh.feed,resultsComplete:false}},null,base+120000).state,'partial');
  assert.equal(feedHealth({...data,board:{paused:true}},null,base+1000000).state,'paused');
  const staging = sample(1000,2,null,'staging'); staging.activity = timingActivity(staging);
  assert.equal(feedHealth(staging,null,base+1010000).state,'healthy');
});
