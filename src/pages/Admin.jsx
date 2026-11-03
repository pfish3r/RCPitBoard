import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldAlert, Check } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import RefreshRateField from "@/components/admin/RefreshRateField";
import {
  DEFAULT_LIVE_URL,
  DEFAULT_RESULTS_URL,
  DEFAULT_SCROLL_SPEED,
  MIN_SCROLL_SPEED,
  MAX_SCROLL_SPEED,
  DEFAULT_REFRESH_SECONDS,
} from "@/lib/trackDefaults";

export default function Admin() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [resultsUrl, setResultsUrl] = useState("");
  const [scrollSpeed, setScrollSpeed] = useState(DEFAULT_SCROLL_SPEED);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_REFRESH_SECONDS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [user, page] = await Promise.all([
          api.auth.me(),
          api.entities.TrackSettings.filter({}, { sort: "-created_date", limit: 1 }),
        ]);
        if (!active) return;
        setIsAdmin(user?.role === "admin");
        const settings = page?.items?.[0] || null;
        setRecordId(settings?.id || null);
        setLiveUrl(settings?.live_url || DEFAULT_LIVE_URL);
        setResultsUrl(settings?.results_url || DEFAULT_RESULTS_URL);
        setScrollSpeed(Number(settings?.scroll_speed) || DEFAULT_SCROLL_SPEED);
        setRefreshSeconds(Number(settings?.refresh_seconds) || DEFAULT_REFRESH_SECONDS);
      } catch (err) {
        if (active) setError(err?.message || "Could not load track settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const payload = {
      live_url: liveUrl.trim(),
      results_url: resultsUrl.trim(),
      scroll_speed: scrollSpeed,
      refresh_seconds: refreshSeconds,
    };
    try {
      if (recordId) {
        await api.entities.TrackSettings.update(recordId, payload);
      } else {
        const created = await api.entities.TrackSettings.create(payload);
        setRecordId(created.id);
      }
      setSaved(true);
    } catch (err) {
      setError(err?.message || "Could not save these settings. Check you're signed in as an admin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-rd-bg font-body text-rd-text">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-rd-muted transition hover:text-rd-bright"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pit board
        </Link>

        <button type="button" onClick={() => logout()} className="float-right text-sm text-rd-muted">Sign out</button>
        <h1 className="mt-5 font-display text-3xl font-semibold uppercase leading-none text-rd-bright lg:text-4xl">
          Track settings
        </h1>
        <p className="mt-2 text-sm text-rd-muted">
          Point the pit board at your track's LiveRC pages and set how the lists scroll. Changes reach the
          board on its next refresh.
        </p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-rd-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
          </div>
        ) : (
          <form onSubmit={save} className="mt-8 space-y-6">
            {!isAdmin && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#ff4d3d]/30 bg-[#ff4d3d]/[0.06] p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rd-live" />
                <p className="text-sm text-rd-dim">
                  Only an admin can change these settings. Sign in with the administrator credentials created during setup.
                </p>
              </div>
            )}

            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rd-muted">
                Live scoring / video URL
              </span>
              <input
                type="url"
                value={liveUrl}
                onChange={(event) => setLiveUrl(event.target.value)}
                disabled={!isAdmin}
                placeholder={DEFAULT_LIVE_URL}
                className="mt-2 h-12 w-full rounded-xl border border-rd-border bg-rd-surface px-4 text-base text-rd-bright placeholder:text-rd-faint focus:border-[#c6f24e]/70 focus:outline-none disabled:opacity-60"
              />
              <span className="mt-1.5 block text-xs text-rd-faint">
                Opened by the “Live” button in the header.
              </span>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rd-muted">
                Results page URL
              </span>
              <input
                type="url"
                value={resultsUrl}
                onChange={(event) => setResultsUrl(event.target.value)}
                disabled={!isAdmin}
                placeholder={DEFAULT_RESULTS_URL}
                className="mt-2 h-12 w-full rounded-xl border border-rd-border bg-rd-surface px-4 text-base text-rd-bright placeholder:text-rd-faint focus:border-[#c6f24e]/70 focus:outline-none disabled:opacity-60"
              />
              <span className="mt-1.5 block text-xs text-rd-faint">
                The board reads race order and times from this URL.
              </span>
            </label>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rd-muted">
                  Auto-scroll speed
                </span>
                <span className="font-mono text-xs text-rd-bright">{scrollSpeed} px/s</span>
              </div>
              <input
                type="range"
                min={MIN_SCROLL_SPEED}
                max={MAX_SCROLL_SPEED}
                step={1}
                value={scrollSpeed}
                onChange={(event) => setScrollSpeed(Number(event.target.value))}
                disabled={!isAdmin}
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rd-border accent-[#c6f24e] disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-rd-faint">
                <span>Slower</span>
                <span>Faster</span>
              </div>
              <span className="mt-1.5 block text-xs text-rd-faint">
                How fast the race order and estimated positions lists scroll.
              </span>
            </div>

            <RefreshRateField value={refreshSeconds} onChange={setRefreshSeconds} disabled={!isAdmin} />

            {error && (
              <p className="rounded-xl border border-[#ff4d3d]/30 bg-[#ff4d3d]/[0.06] px-4 py-3 text-sm text-[#ff9a90]">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!isAdmin || saving}
                className="inline-flex items-center gap-2 rounded-full bg-rd-accent px-5 py-2.5 text-sm font-semibold text-rd-ink transition hover:bg-[#d4ff62] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save settings
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-rd-acctext">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}