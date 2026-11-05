export function fullscreenRaceStatus({ current, timeline = [], timing, now, estimatesAvailable, paused }) {
  const running = current?.status === 'running';
  const race = running ? timeline.find(row => row.racesAway === 0) || current : null;
  const next = timeline.find(row => row.isNext) || null;
  const reliable = Boolean(estimatesAvailable || paused);
  const finishAt = running && reliable && Number.isFinite(timing?.at) ? timing.at : null;
  return { race, next, reliable, finishAt,
    remaining: finishAt === null ? null : Math.max(0, Math.ceil((finishAt-now)/1000)),
    nextAt: reliable && Number.isFinite(next?.estimatedStartAt) ? next.estimatedStartAt : null,
    nextSeconds: reliable && Number.isFinite(next?.secondsAhead) ? next.secondsAhead : null };
}
