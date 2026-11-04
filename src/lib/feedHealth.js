export function timingActivity(snapshot, previous) {
  if (!snapshot?.live || snapshot.feed?.liveConnected === false) return previous || null;
  const live = snapshot.live;
  const key = JSON.stringify([snapshot.track?.liveUrl, snapshot.event, live.roundCode,
    live.raceIndex, live.status, live.timeRemaining, live.timeElapsed,
    live.rows?.map(row => [row.name, row.laps, row.lapTime, row.elapsed])]);
  return previous?.key === key ? previous : { key, changedAt: Date.parse(snapshot.fetchedAt) };
}

export function feedHealth(snapshot, error, now) {
  if (snapshot?.board?.paused) return { state: 'paused', label: 'Board paused', estimatesAvailable: false };
  const receivedAt = Date.parse(snapshot?.feed?.liveReceivedAt || snapshot?.fetchedAt);
  const age = Number.isFinite(receivedAt) ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : null;
  const limit = Math.max(60, (snapshot?.track?.refreshSeconds || 20) * 3);
  if (error || snapshot?.feed?.liveConnected === false) return {
    state: 'disconnected', label: 'Timing feed disconnected', age, estimatesAvailable: false,
  };
  const inactive = snapshot?.live?.status === 'running' && snapshot?.activity
    && now - snapshot.activity.changedAt > Math.max(90000, limit * 1000);
  if (age !== null && (age > limit || inactive)) return {
    state: 'stale', label: inactive ? 'Live timing is not advancing' : 'Timing data is stale', age, estimatesAvailable: false,
  };
  if (!snapshot) return { state: 'connecting', label: 'Connecting to LiveRC', age, estimatesAvailable: false };
  if (snapshot.feed?.resultsComplete === false) return {
    state: 'partial', label: 'Race order incomplete', age, estimatesAvailable: false,
  };
  return { state: 'healthy', label: 'LiveRC connected', age, estimatesAvailable: true };
}
