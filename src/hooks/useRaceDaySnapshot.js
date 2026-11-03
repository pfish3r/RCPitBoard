import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { DEFAULT_REFRESH_SECONDS } from "@/lib/trackDefaults";

export default function useRaceDaySnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.functions.invoke("raceDaySnapshot", {});
      if (response.data?.error) throw new Error(response.data.error);
      setSnapshot(response.data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Could not reach the timing feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  return { snapshot, error, loading, refreshing, refresh: load, now };
}