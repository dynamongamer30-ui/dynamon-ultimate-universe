import { useEffect, useRef } from "react";

/**
 * Ember Field — cursor-reactive ambient background.
 * A field of drifting ember particles connected by faint filaments.
 * The pointer carries a soft heat glow: nearby embers accelerate,
 * brighten, and get gently pulled toward the cursor before escaping.
 * Single canvas, DPR-capped, respects prefers-reduced-motion.
 */
export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || connection?.saveData === true;
    // The rich particle field is a desktop signature, not a permanent tax on every device.
    const shouldAnimate = !reduced && !isMobile && !lowPower;
    const COUNT = shouldAnimate ? 56 : 0;
    const LINK_DIST = 120;

    let width = 0,
      height = 0,
      dpr = 1;
    const setSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();
    window.addEventListener("resize", setSize);

    // Pointer state (lerped for buttery motion)
    let px = width / 2,
      py = height * 0.35;
    let tx = px,
      ty = py;
    let pointerActive = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      pointerActive = true;
    };
    const onLeave = () => {
      pointerActive = false;
    };
    if (shouldAnimate) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    type Ember = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      /** 0 = deep violet, 1 = electric lilac */
      warm: number;
      baseA: number;
      /** excitement level raised by cursor proximity, decays */
      heat: number;
    };
    const embers: Ember[] = Array.from({ length: COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.22 + 0.04),
      r: Math.random() * 1.8 + 0.7,
      warm: Math.random(),
      baseA: Math.random() * 0.4 + 0.15,
      heat: 0,
    }));

    const emberColor = (warm: number, a: number) => {
      // royal violet (hue 275) → electric lilac (hue 320)
      const hue = 275 + warm * 45;
      return `hsla(${hue}, 92%, ${58 + warm * 12}%, ${a})`;
    };

    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.004;
      // lerp pointer glow toward target
      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // ── Cursor energy glow (two layered radials for depth) ──
      if (shouldAnimate) {
        const glowA = pointerActive ? 0.1 : 0.05;
        const g1 = ctx.createRadialGradient(px, py, 0, px, py, 380);
        g1.addColorStop(0, `hsla(292, 92%, 64%, ${glowA})`);
        g1.addColorStop(0.55, `hsla(315, 88%, 56%, ${glowA * 0.35})`);
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const g2 = ctx.createRadialGradient(px, py, 0, px, py, 120);
        g2.addColorStop(0, `hsla(275, 100%, 74%, ${glowA * 0.6})`);
        g2.addColorStop(1, "transparent");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      }

      // ── Ambient breathing corner glow (very subtle, non-cursor) ──
      const bx = width * (0.85 + Math.sin(t * 0.7) * 0.03);
      const by = height * (0.9 + Math.cos(t * 0.5) * 0.03);
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(width, 500) * 0.4);
      bg.addColorStop(0, "hsla(300, 82%, 50%, 0.07)");
      bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // ── Filaments between nearby embers (drawn under particles) ──
      ctx.lineWidth = 0.6;
      for (let i = 0; i < embers.length; i++) {
        for (let j = i + 1; j < embers.length; j++) {
          const a = embers[i],
            b = embers[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / LINK_DIST) * 0.07 * (1 + (a.heat + b.heat) * 2);
            ctx.strokeStyle = `hsla(294, 90%, 68%, ${Math.min(alpha, 0.25)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Embers with cursor physics ──
      for (const p of embers) {
        // cursor attraction within radius, then drift free
        const dx = px - p.x,
          dy = py - p.y;
        const dist = Math.hypot(dx, dy);
        const RADIUS = isMobile ? 160 : 240;
        if (dist < RADIUS && dist > 1) {
          const force = ((RADIUS - dist) / RADIUS) * 0.012;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          p.heat = Math.min(1, p.heat + 0.03);
        }
        p.heat *= 0.985; // decay
        // gentle speed cap so embers escape gracefully
        const sp = Math.hypot(p.vx, p.vy);
        const MAX = 0.9;
        if (sp > MAX) {
          p.vx = (p.vx / sp) * MAX;
          p.vy = (p.vy / sp) * MAX;
        }
        p.x += p.vx;
        p.y += p.vy;
        // upward drift restore
        p.vy += -0.0008;
        p.vx *= 0.995;
        p.vy *= 0.995;

        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
          p.heat = 0;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const alpha = p.baseA + p.heat * 0.5;
        const r = p.r + p.heat * 1.6;
        const color = emberColor(p.warm, Math.min(alpha, 0.9));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 + p.heat * 16;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = document.hidden ? 0 : requestAnimationFrame(loop);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (shouldAnimate && !raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (shouldAnimate) {
      raf = requestAnimationFrame(loop);
    } else {
      // Static violet atmosphere for mobile, low-power, and reduced-motion contexts.
      const g = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, height * 0.8);
      g.addColorStop(0, "hsla(295, 88%, 56%, 0.12)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
      if (shouldAnimate) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerleave", onLeave);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Machined grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />
    </div>
  );
}
