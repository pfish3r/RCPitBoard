import React from "react";

export default function FeedStatus({ health }) {
  const healthy = health.state === "healthy";
  return <div role="status" className={`feed-status flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-rd-border px-4 py-1.5 text-xs sm:px-6 ${healthy ? "text-rd-muted" : "bg-rd-surface text-rd-live"}`}>
    <span className={`h-2 w-2 rounded-full ${healthy ? "bg-rd-accent" : "bg-current"}`} aria-hidden="true" />
    <span className="font-semibold">{health.label}</span>
    {health.age !== null && health.age !== undefined && <span>Last received {health.age < 60 ? `${health.age}s` : `${Math.floor(health.age / 60)}m ${health.age % 60}s`} ago</span>}
    {!health.estimatesAvailable && !["paused", "connecting"].includes(health.state) && <span>Live data may be out of date. Countdown estimates suspended.</span>}
  </div>;
}
