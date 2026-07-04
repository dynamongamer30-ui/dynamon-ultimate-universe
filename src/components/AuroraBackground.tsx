import { useEffect, useRef } from "react";

/**
 * Full-page minimalistic aurora layer + ambient particle field rendered in a single canvas.
 * Designed to be very lightweight and respect prefers-reduced-motion.
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
    const particleCount = reduced ? 0 : isMobile ? 28 : 64;

    let width = 0, height = 0, dpr = 1;
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

    type P = { x: number; y: number; r: number; vx: number; vy: number; hue: number; a: number };
    const particles: P[] = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05),
      hue: Math.random() > 0.5 ? 155 : 280,
      a: Math.random() * 0.5 + 0.2,
    }));

    let t = 0;
    let raf = 0;
    const loop = () => {
      t += 0.003;
      ctx.clearRect(0, 0, width, height);

      // Aurora blobs (3 large, slow, gradient)
      const blobs = [
        { x: width * (0.2 + Math.sin(t) * 0.05), y: height * (0.25 + Math.cos(t * 0.7) * 0.05), r: Math.max(width, 600) * 0.45, c: "rgba(34,197,94,0.20)" },
        { x: width * (0.85 + Math.cos(t * 0.6) * 0.05), y: height * (0.75 + Math.sin(t * 0.9) * 0.05), r: Math.max(width, 600) * 0.42, c: "rgba(139,92,246,0.18)" },
        { x: width * (0.55 + Math.sin(t * 1.1) * 0.06), y: height * (0.1 + Math.cos(t * 0.5) * 0.06), r: Math.max(width, 600) * 0.35, c: "rgba(56,189,248,0.12)" },
      ];
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        const color = p.hue === 155 ? `rgba(110,231,183,${p.a})` : `rgba(196,181,253,${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-90" />
      {/* Subtle grid noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}
