import { useEffect, useRef } from "react";

/** Subtle pointer tilt for feature cards; no animated background layer. */
export function usePerspectiveTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      element.style.setProperty("--card-tilt-x", `${currentY}deg`);
      element.style.setProperty("--card-tilt-y", `${currentX}deg`);
      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
        frame = requestAnimationFrame(paint);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = Math.max(-4, Math.min(4, x * 8));
      targetY = Math.max(-4, Math.min(4, y * -8));
      schedule();
    };
    const reset = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    element.addEventListener("pointermove", onPointerMove, { passive: true });
    element.addEventListener("pointerleave", reset, { passive: true });
    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", reset);
      if (frame) cancelAnimationFrame(frame);
      element.style.removeProperty("--card-tilt-x");
      element.style.removeProperty("--card-tilt-y");
    };
  }, []);

  return ref;
}
