import { useEffect, useRef } from "react";

/**
 * Ember cursor — a precise dot with a spring-trailing ring.
 * The ring expands with a hot ember glow over interactive elements
 * and contracts sharply on press for mechanical feel.
 * Hidden on touch / coarse pointers and for reduced motion.
 */
export function AuroraCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2;
    // spring state for the ring
    let rx = mx,
      ry = my,
      vx = 0,
      vy = 0;
    let isHover = false;
    let isDown = false;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "0.8";
      }
    };
    const hoverable = (target: Element | null) =>
      target?.closest("a,button,[role='button'],input,textarea,select,label,[data-cursor]");
    const onOver = (e: Event) => {
      if (hoverable(e.target as Element)) isHover = true;
    };
    const onOut = (e: Event) => {
      if (hoverable(e.target as Element)) isHover = false;
    };
    const onDown = () => {
      isDown = true;
    };
    const onUp = () => {
      isDown = false;
    };
    const onLeaveWindow = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);

    let raf = 0;
    const loop = () => {
      // critically-damped spring for the ring
      const STIFF = 0.14;
      const DAMP = 0.72;
      vx = (vx + (mx - rx) * STIFF) * DAMP;
      vy = (vy + (my - ry) * STIFF) * DAMP;
      rx += vx;
      ry += vy;

      const scale = isDown ? 0.72 : isHover ? 1.55 : 1;
      dot.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0) scale(${isDown ? 0.6 : 1})`;
      ring.style.transform = `translate3d(${rx - 19}px, ${ry - 19}px, 0) scale(${scale})`;
      ring.style.borderColor = isHover ? "oklch(0.76 0.17 50 / 0.9)" : "oklch(0.7 0.19 42 / 0.55)";
      ring.style.boxShadow = isHover
        ? "0 0 22px 2px oklch(0.7 0.19 42 / 0.35)"
        : "0 0 14px 0px oklch(0.7 0.19 42 / 0.18)";

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[61] hidden h-[38px] w-[38px] rounded-full border opacity-0 transition-opacity duration-300 md:block"
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[62] hidden h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 md:block"
        style={{ background: "oklch(0.8 0.16 50)", boxShadow: "0 0 8px oklch(0.7 0.19 42 / 0.9)" }}
        aria-hidden
      />
    </>
  );
}
