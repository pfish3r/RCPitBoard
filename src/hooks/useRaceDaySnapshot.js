import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { DEFAULT_REFRESH_SECONDS } from "@/lib/trackDefaults";
import { anchorRaceTiming } from "@/lib/raceday";

export default function useRaceDaySnapshot() {
  const requestId = useRef(0);
  const boardRevision = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setRefreshing(true);
    try {
      const response = await api.functions.invoke("raceDaySnapshot", {});
      if (id !== requestId.current) return;
      boardRevision.current = response.data.board?.revision;
      if (response.data?.error) throw new Error(response.data.error);
      setSnapshot(previous => ({
        ...response.data,
        timing: anchorRaceTiming(response.data, previous?.timing),
      }));
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err?.response?.data?.error || err.message || "Could not reach the timing feed");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const refreshSeconds = snapshot?.track?.refreshSeconds || DEFAULT_REFRESH_SECONDS;

  useEffect(() => {
    load();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [load]);

  useEffect(() => {
    const poll = setInterval(load, refreshSeconds * 1000);
    return () => clearInterval(poll);
  }, [load, refreshSeconds]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const status = await api.board.status();
        if (status.revision !== boardRevision.current) {
          boardRevision.current = status.revision;
          load();
        }
      } catch { /* Snapshot polling reports connection failures. */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [load]);

  const boardNow = snapshot?.board?.paused ? snapshot.board.pausedAt : now;
  return { snapshot, error, loading, refreshing, refresh: load, now: boardNow };
}
