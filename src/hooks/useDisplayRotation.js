import { useEffect, useState, useCallback } from 'react';
import { nextDisplayPanel } from '@/lib/displayLayout';

export default function useDisplayRotation(enabled, durations) {
  const [panel, setPanel] = useState('live');
  const [startedAt, setStartedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  const advance = useCallback(() => { setPanel(current => nextDisplayPanel(current)); setStartedAt(Date.now()); }, []);
  useEffect(() => { setPanel('live'); setStartedAt(Date.now()); }, [enabled]);
  const seconds = durations?.[panel] || 15;
  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(advance, Math.max(0, seconds * 1000 - (Date.now() - startedAt)));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(timeout); clearInterval(timer); };
  }, [enabled, panel, startedAt, seconds, advance]);
  return { panel, advance, remaining: Math.max(0, Math.ceil(seconds - (Math.max(now, startedAt)-startedAt)/1000)) };
}
