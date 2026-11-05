import React from 'react';
import { formatClock, formatCountdown } from '@/lib/raceday';
import { fullscreenRaceStatus } from '@/lib/fullscreenRaceStatus';

export default function FullscreenRaceStrip({ current, timeline, timing, now, estimatesAvailable, paused }) {
  const { race, next, reliable, finishAt, remaining, nextAt, nextSeconds } = fullscreenRaceStatus({ current, timeline, timing, now, estimatesAvailable, paused });
  return <section className="fullscreen-race-strip" aria-label="Current and next race">
    <article className="fullscreen-race-summary">
      <div className="fullscreen-race-name">
        <span className="fullscreen-race-label">{!reliable ? 'Last on track' : 'On track'}</span>
        <strong title={race?.className}>{race ? `Race ${race.num || current?.seq || '-'} / ${race.className}` : 'Track clear'}</strong>
        <small>{race ? race.heat || current?.heat || 'Single heat' : current?.status === 'complete' ? 'Race finished' : 'Waiting for a race'}</small>
      </div>
      <div className="fullscreen-race-time">
        <strong>{remaining === null ? '--:--' : remaining === 0 ? 'Finishing' : formatCountdown(remaining)}</strong>
        <small>{!reliable ? 'Timing unavailable' : paused ? 'Paused' : finishAt !== null ? `Est. finish ${formatClock(finishAt)}` : 'Est. remaining'}</small>
      </div>
    </article>
    <article className="fullscreen-race-summary is-next">
      <div className="fullscreen-race-name">
        <span className="fullscreen-race-label">Next on</span>
        <strong title={next?.className}>{next ? `Race ${next.num} / ${next.className}` : 'No race queued'}</strong>
        <small>{next?.heat || 'Check race order'}</small>
      </div>
      <div className="fullscreen-race-time">
        <strong>{nextAt === null ? '--:--' : next.overdue ? 'Delayed' : formatClock(nextAt)}</strong>
        <small>{!reliable ? 'Estimate unavailable' : paused ? 'Paused' : next?.overdue ? 'Estimated start passed' : nextSeconds !== null ? `In ${formatCountdown(nextSeconds)}` : 'Awaiting timing'}</small>
      </div>
    </article>
  </section>;
}
