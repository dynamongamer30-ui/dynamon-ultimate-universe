import { useEffect, useRef, useState } from "react";

/**
 * A deliberately small WebGL accent: one icosahedron mesh, one material, and
 * three lights. The DOM hero and its static image remain the content/LCP layer.
 */
export function HeroWebGL() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof memory === "number" && memory <= 1) {
      setFailed(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px 0px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad || failed) return;

    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let disposed = false;
    let disposeScene: (() => void) | undefined;

    void import("@/lib/heroScene")
      .then(({ createHeroScene }) => {
        if (disposed) return;
        try {
          const controller = createHeroScene(canvas, host);
          disposeScene = controller.dispose;
          if (disposed) disposeScene();
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      disposeScene?.();
    };
  }, [failed, shouldLoad]);

  return (
    <div ref={hostRef} className="hero-webgl-host" aria-hidden="true">
      {!failed && shouldLoad ? <canvas ref={canvasRef} className="hero-webgl-canvas" aria-hidden="true" /> : null}
    </div>
  );
}

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

export function HeroDepthLayers() {
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let scrollY = window.scrollY;
    let frame = 0;
    const factors = [0.2, 0.5, 1];

    const paint = () => {
      frame = 0;
      layerRefs.current.forEach((layer, index) => {
        if (layer) layer.style.transform = `translate3d(0, ${scrollY * factors[index]}px, 0)`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
      schedule();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    schedule();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-depth-layers" aria-hidden="true">
      {[0, 1, 2].map((layer) => (
        <div
          key={layer}
          ref={(element) => { layerRefs.current[layer] = element; }}
          className={`hero-depth-layer hero-depth-layer-${layer + 1}`}
        />
      ))}
    </div>
  );
}
