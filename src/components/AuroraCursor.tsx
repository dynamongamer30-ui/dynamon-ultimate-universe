import { useEffect, useRef } from "react";

/** Optional pointer depth. Schedule frames only while the spring is moving. */
export function AuroraCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dot = dotRef.current,
      ring = ringRef.current;
    if (!dot || !ring) return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const enabled = () => !coarse.matches && !reduced.matches && wide.matches && !document.hidden;
    let mx = innerWidth / 2,
      my = innerHeight / 2,
      rx = mx,
      ry = my,
      vx = 0,
      vy = 0;
    let visible = false,
      hover = false,
      down = false,
      frame = 0;
    const schedule = () => {
      if (!frame && visible && enabled()) frame = requestAnimationFrame(paint);
    };
    const paint = () => {
      frame = 0;
      if (!visible || !enabled()) return;
      vx = (vx + (mx - rx) * 0.14) * 0.72;
      vy = (vy + (my - ry) * 0.14) * 0.72;
      rx += vx;
      ry += vy;
      const moving = Math.abs(mx - rx) + Math.abs(my - ry) + Math.abs(vx) + Math.abs(vy) > 0.05;
      if (!moving) {
        rx = mx;
        ry = my;
        vx = 0;
        vy = 0;
      }
      dot.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0) scale(${down ? 0.6 : 1})`;
      ring.style.transform = `translate3d(${rx - 19}px, ${ry - 19}px, 0) scale(${down ? 0.72 : hover ? 1.55 : 1})`;
      ring.classList.toggle("aurora-ring-hover", hover);
      if (moving) schedule();
    };
    const hide = () => {
      visible = false;
      hover = false;
      down = false;
      cancelAnimationFrame(frame);
      frame = 0;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const move = (event: PointerEvent) => {
      if (!enabled()) return;
      mx = event.clientX;
      my = event.clientY;
      if (!visible) {
        rx = mx;
        ry = my;
        vx = 0;
        vy = 0;
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "0.8";
      }
      schedule();
    };
    const interactive = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest("a,button,[role='button'],input,textarea,select,label,[data-cursor]");
    const over = (event: Event) => {
      if (interactive(event.target)) {
        hover = true;
        schedule();
      }
    };
    const out = (event: Event) => {
      if (interactive(event.target)) {
        hover = false;
        schedule();
      }
    };
    const press = () => {
      down = true;
      schedule();
    };
    const release = () => {
      down = false;
      schedule();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("visibilitychange", hide);
    for (const media of [coarse, reduced, wide]) media.addEventListener("change", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("pointerout", out, true);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", hide);
      for (const media of [coarse, reduced, wide]) media.removeEventListener("change", hide);
    };
  }, []);
  return (
    <>
      <div
        ref={ringRef}
        className="aurora-ring pointer-events-none fixed left-0 top-0 z-[61] hidden h-[38px] w-[38px] rounded-full border opacity-0 transition-opacity duration-300 md:block"
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[62] hidden h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 md:block"
        style={{ background: "var(--primary)", boxShadow: "var(--interactive-glow)" }}
        aria-hidden
      />
    </>
  );
}
