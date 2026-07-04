import { useEffect, useRef } from "react";

/**
 * Premium aurora cursor: a soft glow follows the pointer with springy trailing
 * particles. Hidden on touch / coarse pointers.
 */
export function AuroraCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const canvas = trailRef.current;
    if (!dot || !ring || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let mx = w / 2, my = h / 2;
    let rx = mx, ry = my;
    type T = { x: number; y: number; life: number; hue: number };
    const trail: T[] = [];

    const onMove = (e: PointerEvent) => {
      mx = e.clientX; my = e.clientY;
      trail.push({ x: mx, y: my, life: 1, hue: Math.random() > 0.5 ? 155 : 280 });
      if (trail.length > 36) trail.shift();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const hover = (target: Element | null) =>
      target?.closest("a,button,[role='button'],input,textarea,select,label,[data-cursor]");
    let isHover = false;
    const onOver = (e: Event) => { if (hover(e.target as Element)) isHover = true; };
    const onOut = (e: Event) => { if (hover(e.target as Element)) isHover = false; };
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);

    let raf = 0;
    const loop = () => {
      // smooth ring follow
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
      ring.style.transform = `translate(${rx - 22}px, ${ry - 22}px) scale(${isHover ? 1.6 : 1})`;
      ring.style.opacity = isHover ? "1" : "0.7";

      // trail
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.life -= 0.04;
        if (p.life <= 0) continue;
        const r = 14 * p.life + 2;
        const color = p.hue === 155 ? `rgba(110,231,183,${p.life * 0.35})` : `rgba(196,181,253,${p.life * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
    };
  }, []);

  return (
    <>
      <canvas ref={trailRef} className="pointer-events-none fixed inset-0 z-[60] hidden md:block" aria-hidden />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[61] hidden h-11 w-11 rounded-full border border-emerald-300/70 transition-[transform,opacity] duration-150 md:block"
        style={{ boxShadow: "0 0 24px 4px rgba(110,231,183,0.35), inset 0 0 14px rgba(196,181,253,0.4)" }}
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[62] hidden h-2 w-2 rounded-full bg-emerald-200 md:block"
        style={{ boxShadow: "0 0 10px rgba(110,231,183,0.9)" }}
        aria-hidden
      />
    </>
  );
}
