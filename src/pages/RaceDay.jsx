import React, { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import useRaceDaySnapshot from "@/hooks/useRaceDaySnapshot";
import {
  DRIVER_KEY,
  LIVE_PANEL_KEY,
  buildTimeline,
  collectDrivers,
  isFinalsRound,
  nextRaceForDriver,
} from "@/lib/raceday";
import { DEFAULT_LIVE_URL, DEFAULT_RESULTS_URL, DEFAULT_SCROLL_SPEED } from "@/lib/trackDefaults";
import RaceDayHeader from "@/components/raceday/RaceDayHeader";
import RoundTabs from "@/components/raceday/RoundTabs";
import RaceOrder from "@/components/raceday/RaceOrder";
import LiveResults from "@/components/raceday/LiveResults";
import EpdPanel from "@/components/raceday/EpdPanel";
import DriverBar from "@/components/raceday/DriverBar";
import useAudioAnnouncements from "@/hooks/useAudioAnnouncements";
import useHeatStartChime from "@/hooks/useHeatStartChime";

export default function RaceDay() {
  const { snapshot, error, loading, refreshing, refresh, now } = useRaceDaySnapshot();
  const [driverKey, setDriverKey] = useState(() => localStorage.getItem(DRIVER_KEY) || "");
  const [viewRoundId, setViewRoundId] = useState(null);
  const [showLive, setShowLive] = useState(() => localStorage.getItem(LIVE_PANEL_KEY) !== "off");

  const rounds = snapshot?.rounds || [];
  const activeRound = rounds.find((round) => round.id === snapshot?.activeRoundId) || rounds[0] || null;
  const viewRound = rounds.find((round) => round.id === viewRoundId) || activeRound;
  const isActiveRound = viewRound && activeRound ? viewRound.id === activeRound.id : false;

  const drivers = useMemo(() => collectDrivers(rounds), [rounds]);

  const timeline = useMemo(
    () =>
      buildTimeline({
        round: viewRound,
        current: snapshot?.current,
        cadenceMinutes: snapshot?.cadenceMinutes,
        fetchedAt: snapshot?.fetchedAt,
        now,
        driverKey,
        viewerRoundIsActive: isActiveRound,
      }),
    [viewRound, snapshot?.current, snapshot?.cadenceMinutes, snapshot?.fetchedAt, now, driverKey, isActiveRound]
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
            now,
            driverKey,
            viewerRoundIsActive: true,
          }),
    [isActiveRound, timeline, activeRound, snapshot?.current, snapshot?.cadenceMinutes, snapshot?.fetchedAt, now, driverKey]
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
  });
  useHeatStartChime({ live: snapshot?.live, enabled: audioOn && announcementSettings.heatStartChime });

  // During the mains/finals the projection feed adds little: drop the panel and
  // give the live timing the full width instead.
  const showEpd = !isFinalsRound(activeRound?.label);

  const scrollSpeed = snapshot?.track?.scrollSpeed || DEFAULT_SCROLL_SPEED;

  const inViewRound = timeline.some((race) => race.mine);
  const emptyMessage = inViewRound
    ? `Done in ${viewRound?.label || "this round"} — check the round tabs for your next one.`
    : `No entry in ${viewRound?.label || "this round"} — check the round tabs above.`;

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
    ? Math.max(0, Math.round((now - new Date(snapshot.fetchedAt).getTime()) / 1000))
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-rd-bg font-body text-rd-text lg:h-screen lg:overflow-hidden">
      <RaceDayHeader
        track={snapshot?.track}
        event={snapshot?.event}
        current={snapshot?.current}
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
          <div className="shrink-0 px-4 pt-2 sm:px-6">
            <RoundTabs
              rounds={rounds}
              activeRoundId={snapshot?.activeRoundId}
              value={viewRound?.id}
              onChange={setViewRoundId}
            />
            {error && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-rd-live">Showing last good data</p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <main
              className={`px-4 pb-4 pt-3 sm:px-6 lg:min-h-0 lg:overflow-hidden ${
                showLive ? "lg:w-1/2 lg:shrink-0" : "lg:flex-1"
              }`}
            >
              <RaceOrder
                timeline={visibleTimeline}
                roundLabel={viewRound?.label}
                isActiveRound={isActiveRound}
                cadenceMinutes={snapshot?.cadenceMinutes}
                scrollSpeed={scrollSpeed}
              />
            </main>

            {showLive && (
              <aside className="shrink-0 border-t border-rd-border px-4 pb-4 pt-4 sm:px-6 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:overflow-hidden lg:border-l lg:border-t-0">
                <div
                  className={`grid gap-4 lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] ${
                    showEpd ? "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : ""
                  }`}
                >
                  <LiveResults
                    live={snapshot?.live}
                    driverKey={driverKey}
                    wide={!showEpd}
                    scrollSpeed={scrollSpeed}
                  />
                  {showEpd && (
                    <EpdPanel
                      epd={snapshot?.epd}
                      live={snapshot?.live}
                      driverKey={driverKey}
                      scrollSpeed={scrollSpeed}
                    />
                  )}
                </div>
              </aside>
            )}
          </div>

          <DriverBar
            drivers={drivers}
            driverKey={driverKey}
            myRace={myRace}
            emptyMessage={emptyMessage}
            onSelect={pickDriver}
            onClear={() => pickDriver("")}
          />
        </>
      )}
    </div>
  );
}