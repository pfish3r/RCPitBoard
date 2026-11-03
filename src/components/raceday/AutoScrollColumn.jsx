import React, { useEffect, useRef, useState } from "react";

const PAUSE_AT_END = 900; // ms held at the bottom before looping
const MAX_COPIES = 4;

const DEFAULT_CLASS =
  "min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Slowly rolls its content upwards.
 * `repeat` keeps the column moving even when the content is shorter than the
 * visible area: the content is rendered enough times to fill the window and the
 * scroll position wraps at one copy, so the roll never stops.
 */
export default function AutoScrollColumn({ children, className, speed = 16, repeat = false, bounce = false }) {
  const ref = useRef(null);
  const first = useRef(null);
  const second = useRef(null);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    if (!repeat) {
      setCopies(1);
      return;
    }
    const node = ref.current;
    const box = first.current;
    if (!node || !box) return;

    const measure = () => {
      const view = node.clientHeight;
      const one = box.offsetHeight;
      if (!view || !one) return;
      const need = Math.min(MAX_COPIES, Math.max(1, Math.ceil((view + 1) / one)));
      setCopies((prev) => (prev === need ? prev : need));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(box);
    return () => observer.disconnect();
  }, [repeat]);

  const rendered = repeat ? copies : 1;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = null;
    let last = performance.now();
    let hold = 0;
    // Browsers round scrollTop to whole pixels, so sub-pixel steps would be
    // lost every frame. Track the exact position here and only write it out.
    let pos = node.scrollTop;
    let dir = 1;

    const step = (time) => {
      const delta = Math.min((time - last) / 1000, 0.2);
      last = time;

      const max = node.scrollHeight - node.clientHeight;
      const travel =
        rendered > 1 && second.current && first.current
          ? second.current.offsetTop - first.current.offsetTop
          : 0;

      if (Math.abs(node.scrollTop - pos) > 2) pos = node.scrollTop;

      if (max > 2) {
        if (travel > 0) {
          pos += speed * delta;
          if (pos >= travel) pos -= travel;
        } else if (hold > 0) {
          hold -= delta * 1000;
          if (hold <= 0) {
            if (bounce) dir = -dir;
            else pos = 0;
          }
        } else if (dir > 0 && pos >= max - 0.5) {
          hold = PAUSE_AT_END;
        } else if (dir < 0 && pos <= 0.5) {
          hold = PAUSE_AT_END;
        } else {
          pos = Math.max(0, Math.min(max, pos + dir * speed * delta));
        }
      } else {
        pos = 0;
      }
      node.scrollTop = pos;

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [speed, rendered, bounce]);

  return (
    <div ref={ref} className={className || DEFAULT_CLASS}>
      <div className="flex flex-col gap-1">
        {Array.from({ length: rendered }).map((_, index) => (
          <div
            key={index}
            ref={index === 0 ? first : index === 1 ? second : null}
            aria-hidden={index > 0}
            className="flex flex-col gap-1"
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}