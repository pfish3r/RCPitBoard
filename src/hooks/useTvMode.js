import { useEffect, useState } from "react";

export default function useTvMode() {
  const [tvMode, setTvMode] = useState(() => new URLSearchParams(location.search).get('tv') === '1' || localStorage.getItem('rcpitboard_tv') === 'on');
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const toggleTv = () => {
    const next = !tvMode;
    setTvMode(next);
    localStorage.setItem('rcpitboard_tv', next ? 'on' : 'off');
    const url = new URL(location.href);
    if (next) url.searchParams.set('tv', '1'); else url.searchParams.delete('tv');
    history.replaceState(null, '', url);
    setFullscreenError('');
    if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const toggleFullscreen = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setFullscreenError('Fullscreen is unavailable in this browser. TV mode is still active.');
    } catch { setFullscreenError('Fullscreen was blocked. Use your browser fullscreen control.'); }
  };
  return { tvMode, toggleTv, fullscreen, toggleFullscreen, fullscreenError };
}
