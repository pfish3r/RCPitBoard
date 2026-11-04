// Learn only adjacent heats in the same meeting. Polling makes these estimates,
// not an official timetable. Keep a short median to tolerate delayed results.
export function observeRaceTiming(previous, snapshot, interrupted = false) {
  const eventKey = JSON.stringify([snapshot.track?.liveUrl, snapshot.event?.name, snapshot.event?.date]);
  let state = previous?.eventKey === eventKey ? structuredClone(previous) : { eventKey, gaps: [] };
  const at = Date.parse(snapshot.fetchedAt);
  const current = snapshot.current;
  if (!Number.isFinite(at) || !current?.seq || snapshot.feed?.liveConnected === false) return state;
  if (interrupted) { state.active = null; state.finished = null; }
  const key = `${current.roundId}:${current.seq}`;
  const adjacent = race => race?.roundId === current.roundId && race.seq + 1 === current.seq;
  const remaining = current.remainingSeconds;
  const timed = typeof remaining === 'number' && Number.isFinite(remaining);
  const duration = current.lengthSeconds;
  // Discard observations separated by an outage or a large jump in sampling.
  if (state.observedAt && at - state.observedAt > Math.max(180000, (snapshot.track?.refreshSeconds || 20) * 5000)) {
    state.active = null; state.finished = null;
  }
  if (state.active && state.active.key !== key) {
    if (adjacent(state.active)) state.finished = {
      ...state.active, endAt: Math.min(state.active.endAt ?? at, at),
    };
    else state.finished = null;
    state.active = null;
  }
  if (current.status === 'running') {
    if (!state.active && adjacent(state.finished) && timed && duration > 0 && remaining <= duration) {
      const startAt = at - (duration - Math.max(0, remaining)) * 1000;
      const gap = Math.round((startAt - state.finished.endAt) / 1000);
      // A gap above ten minutes is a break, not typical turnaround.
      if (gap >= 15 && gap <= 600) state.gaps = [...state.gaps, gap].slice(-9);
      state.finished = null;
    }
    state.active = { key, seq: current.seq, roundId: current.roundId,
      remainingSeconds: remaining,
      endAt: timed ? state.active?.remainingSeconds === remaining ? state.active.endAt : remaining <= 0 && state.active?.endAt ? Math.min(at, state.active.endAt)
        : at + Math.max(0, remaining) * 1000 : state.active?.endAt ?? null };
  } else if (current.status === 'complete' && state.active?.key === key) {
    state.finished = { ...state.active, endAt: Math.min(state.active.endAt ?? at, at) };
    state.active = null;
  }
  state.observedAt = at;
  return state;
}

export function raceEstimate(state, snapshot) {
  const sorted = [...(state?.gaps || [])].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const gap = sorted.length ? Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : 120;
  const current = snapshot.current;
  const finished = state?.finished;
  return { turnaroundSeconds: gap, samples: sorted.length,
    source: sorted.length ? 'observed' : 'default',
    stagingStartAt: current?.status === 'pending' && finished?.roundId === current.roundId
      && finished.seq + 1 === current.seq ? finished.endAt + gap * 1000 : null };
}
