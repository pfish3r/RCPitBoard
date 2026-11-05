import React, { useMemo, useState } from "react";
import { TriangleAlert, Pause } from "lucide-react";
import useRaceDaySnapshot from "@/hooks/useRaceDaySnapshot";
import {
  DRIVER_KEY,
  LIVE_PANEL_KEY,
  buildTimeline,
  collectDrivers,
  nextRaceForDriver,
  isFinalsRound,
} from "@/lib/raceday";
import { DEFAULT_LIVE_URL, DEFAULT_RESULTS_URL, DEFAULT_SCROLL_SPEED } from "@/lib/trackDefaults";
import FeedStatus from "@/components/raceday/FeedStatus";
import useTvMode from "@/hooks/useTvMode";
import RaceDayHeader from "@/components/raceday/RaceDayHeader";
import RoundTabs from "@/components/raceday/RoundTabs";
import RaceOrder from "@/components/raceday/RaceOrder";
import LiveResults from "@/components/raceday/LiveResults";
import EpdPanel from "@/components/raceday/EpdPanel";
import DriverBar from "@/components/raceday/DriverBar";
import useAudioAnnouncements from "@/hooks/useAudioAnnouncements";
import useHeatStartChime from "@/hooks/useHeatStartChime";

export default function RaceDay() {
  const { snapshot, error, loading, refreshing, refresh, now, health, wallNow } = useRaceDaySnapshot();
  const { tvMode, toggleTv, fullscreen, toggleFullscreen, fullscreenError } = useTvMode();
  const [driverKey, setDriverKey] = useState(() => localStorage.getItem(DRIVER_KEY) || "");
  const [viewRoundId, setViewRoundId] = useState(null);
  const [showLive, setShowLive] = useState(() => localStorage.getItem(LIVE_PANEL_KEY) !== "off");

  const displayLive = tvMode || showLive;
  const paused = Boolean(snapshot?.board?.paused);
  const estimatesAvailable = health.estimatesAvailable || paused;
  const rounds = snapshot?.rounds || [];
  const activeRound = rounds.find((round) => round.id === snapshot?.activeRoundId) || rounds[0] || null;
  const selectedRound = rounds.find((round) => round.id === viewRoundId) || activeRound;
  const viewRound = tvMode ? activeRound : selectedRound;
  const isActiveRound = viewRound && activeRound ? viewRound.id === activeRound.id : false;

  const drivers = useMemo(() => collectDrivers(rounds), [rounds]);

  const timeline = useMemo(
    () =>
      buildTimeline({
        round: viewRound,
        current: snapshot?.current,
        cadenceMinutes: snapshot?.cadenceMinutes,
        fetchedAt: snapshot?.fetchedAt,
        timing: snapshot?.timing,
        timingEstimate: snapshot?.timingEstimate,
        estimatesAvailable,
        now,
        driverKey,
        viewerRoundIsActive: isActiveRound,
      }),
    [viewRound, snapshot?.current, snapshot?.cadenceMinutes, snapshot?.fetchedAt, snapshot?.timing, snapshot?.timingEstimate, estimatesAvailable, now, driverKey, isActiveRound]
  );

  const visibleTimeline = useMemo(
    () => (isActiveRound ? timeline.filter((race) => race.status !== "complete") : timeline),
    [isActiveRound, timeline]
  );

  const activeTimeline = useMemo(
    () =>
      isActiveRound
        ? timeline
        : buildTimeline({
            round: activeRound,
            current: snapshot?.current,
            cadenceMinutes: snapshot?.cadenceMinutes,
            fetchedAt: snapshot?.fetchedAt,
            timing: snapshot?.timing,
            timingEstimate: snapshot?.timingEstimate,
            estimatesAvailable,
            now,
            driverKey,
            viewerRoundIsActive: true,
          }),
    [isActiveRound, timeline, activeRound, snapshot?.current, snapshot?.cadenceMinutes, snapshot?.fetchedAt, snapshot?.timing, snapshot?.timingEstimate, estimatesAvailable, now, driverKey]
  );

  const myRace = useMemo(
    () =>
      nextRaceForDriver(timeline, viewRound?.label) ||
      nextRaceForDriver(activeTimeline, activeRound?.label),
    [timeline, activeTimeline, viewRound?.label, activeRound?.label]
  );

  const { enabled: audioOn, toggle: toggleAudio, settings: announcementSettings, changeSetting } = useAudioAnnouncements({
    current: snapshot?.current,
    timeline: activeTimeline,
    paused: paused || !health.estimatesAvailable,
  });
  useHeatStartChime({ live: snapshot?.live, enabled: health.estimatesAvailable && !paused && audioOn && announcementSettings.heatStartChime });


  const doubleRaceOrder = displayLive && isFinalsRound(activeRound?.label);
  const scrollSpeed = snapshot?.track?.scrollSpeed || DEFAULT_SCROLL_SPEED;

  const inViewRound = timeline.some((race) => race.mine);
  const emptyMessage = inViewRound
    ? `Done in ${viewRound?.label || "this round"} - check the round tabs for your next one.`
    : `No entry in ${viewRound?.label || "this round"} - check the round tabs above.`;

  const pickDriver = (key) => {
    setDriverKey(key);
    if (key) localStorage.setItem(DRIVER_KEY, key);
    else localStorage.removeItem(DRIVER_KEY);
  };

  const toggleLive = () => {
    const next = !showLive;
    setShowLive(next);
    localStorage.setItem(LIVE_PANEL_KEY, next ? "on" : "off");
  };

  const updatedSeconds = snapshot?.fetchedAt
    ? Math.max(0, Math.round((wallNow - new Date(snapshot.fetchedAt).getTime()) / 1000))
    : 0;

  return (
    <div className={`${tvMode ? "tv-mode " : ""}flex min-h-screen flex-col bg-rd-bg font-body text-rd-text lg:h-screen lg:overflow-hidden`}>
      <RaceDayHeader
        roundLabel={activeRound?.label}
        health={health}
        feedHealthy={health.estimatesAvailable}
        tvMode={tvMode}
        onToggleTv={toggleTv}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        track={snapshot?.track}
        event={snapshot?.event}
        current={displayLive ? null : snapshot?.current}
        liveUrl={snapshot?.track?.liveUrl || DEFAULT_LIVE_URL}
        resultsUrl={snapshot?.track?.resultsUrl || DEFAULT_RESULTS_URL}
        showLive={showLive}
        onToggleLive={toggleLive}
        audioOn={audioOn}
        onToggleAudio={toggleAudio}
        announcementSettings={announcementSettings}
        onAnnouncementSettingChange={changeSetting}
        onRefresh={refresh}
        refreshing={refreshing}
        updatedSeconds={updatedSeconds}
      />

      {!health.estimatesAvailable && !["paused", "connecting"].includes(health.state) && <FeedStatus health={health} />}
      {fullscreenError && <p role="status" className="px-6 py-2 text-sm text-rd-muted">{fullscreenError}</p>}

      {paused && (
        <div role="status" className="flex shrink-0 items-center justify-center gap-2 border-y border-rd-border bg-rd-surface px-4 py-3 text-sm font-semibold text-rd-acctext">
          <Pause className="h-4 w-4" /> Board paused. Race updates and countdowns will continue when resumed.
        </div>
      )}

      {loading && !snapshot ? (
        <main className="flex-1 px-4 py-4 sm:px-6">
          <div className="grid gap-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl border border-rd-border bg-rd-surface2" />
            ))}
          </div>
        </main>
      ) : error && !snapshot ? (
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-[#ff4d3d]/30 bg-[#ff4d3d]/[0.06] p-6">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-rd-live" />
            <div>
              <p className="font-medium text-rd-bright">Timing feed unavailable</p>
              <p className="mt-1 text-sm text-rd-muted">{error}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 rounded-full bg-rd-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rd-ink"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          <div className={`dashboard-layout ${displayLive ? "dashboard-with-live" : "dashboard-order-only"}`}>
            {displayLive && (
              <div className="dashboard-live board-panel">
                <LiveResults
                  live={snapshot?.live}
                  driverKey={driverKey}
                  stale={!health.estimatesAvailable && !paused}
                  paused={paused}
                  remainingSeconds={typeof snapshot?.current?.remainingSeconds === "number" && Number.isFinite(snapshot?.timing?.at)
                    ? Math.max(0, Math.ceil((snapshot.timing.at - now) / 1000)) : null}
                />
              </div>
            )}
            <main className={`dashboard-order board-panel ${doubleRaceOrder ? "finals-order" : ""}`}>
              {!tvMode && <div className="mb-2 shrink-0">
                <RoundTabs rounds={rounds} activeRoundId={snapshot?.activeRoundId} value={viewRound?.id} onChange={setViewRoundId} />
              </div>}
              <div className="min-h-0 flex-1">
                <RaceOrder timeline={visibleTimeline} roundLabel={viewRound?.label} isActiveRound={isActiveRound}
                  timingEstimate={snapshot?.timingEstimate} tvMode={tvMode} columns={doubleRaceOrder ? 2 : 1} />
              </div>
            </main>
            {displayLive && !doubleRaceOrder && (
              <aside aria-label="Estimated positions" className="dashboard-epd board-panel">
                <EpdPanel epd={snapshot?.epd} live={snapshot?.live} driverKey={driverKey} scrollSpeed={scrollSpeed} />
              </aside>
            )}
          </div>
          {!tvMode && <DriverBar
            drivers={drivers}
            driverKey={driverKey}
            myRace={myRace}
            emptyMessage={emptyMessage}
            onSelect={pickDriver}
            onClear={() => pickDriver("")}
          />}
        </>
      )}
    </div>
  );
}


