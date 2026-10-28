import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Box } from "lucide-react";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import type { DragonController, DragonMotion } from "./DragonScene";
import "./shadow-dragon.css";

export function ShadowDragon() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<DragonController | null>(null);
  const reduced = useReducedMotionPreference();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motion, setMotion] = useState<DragonMotion>("Fly Hover");
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useEffect(() => {
    let disposed = false;
    const target = host.current;
    if (!target) return;
    setStatus("loading");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import("./DragonScene")
          .then(({ createDragonScene }) => {
            if (disposed) return;
            controller.current = createDragonScene(
              target,
              reducedRef.current,
              () => {
                if (!disposed) setStatus("ready");
              },
              () => {
                if (!disposed) setStatus("error");
              },
            );
          })
          .catch(() => {
            if (!disposed) setStatus("error");
          });
      },
      { rootMargin: "100px" },
    );
    observer.observe(target);
    return () => {
      disposed = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    controller.current?.pause(paused || reduced);
  }, [paused, reduced, status]);
  const changeMotion = (value: DragonMotion) => {
    setMotion(value);
    controller.current?.motion(value);
  };
  return (
    <section className="shadow-dragon" aria-label="Shadow guardian interactive dragon">
      <div className="dragon-eyebrow">
        <span /> ROYAL BLACK / SHADOW GUARDIAN
      </div>
      <div className="dragon-viewport">
        <img
          className={`dragon-poster ${status === "ready" ? "dragon-poster-hidden" : ""}`}
          src="/models/shadow-dragon-poster.png"
          alt="The Royal Black shadow dragon, wings spread over an obsidian platform"
          width={1100}
          height={900}
        />
        <div
          ref={host}
          className={`dragon-canvas ${status !== "ready" ? "dragon-canvas-pending" : ""}`}
        />
        <div className="dragon-status" role="status">
          {status === "loading" && (
            <>
              <Box size={14} /> Preparing the guardian…
            </>
          )}
          {status === "error" && (
            <>
              Showing artwork{" "}
              <button
                onClick={() => {
                  setMotion("Fly Hover");
                  setAttempt((n) => n + 1);
                }}
              >
                Retry 3D
              </button>
            </>
          )}
        </div>
      </div>
      <div className="dragon-console">
        <div className="dragon-animation" role="group" aria-label="Dragon animation">
          {(
            [
              ["Fly Hover", "Awaken"],
              ["Fly Flap", "Flight"],
              ["Roar", "Roar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              disabled={status !== "ready"}
              aria-pressed={motion === value}
              onClick={() => changeMotion(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dragon-actions" role="group" aria-label="Dragon view controls">
          <button
            disabled={status !== "ready"}
            aria-label="Rotate dragon left"
            onClick={() => controller.current?.rotate(-0.5)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            disabled={status !== "ready" || reduced}
            aria-label={paused || reduced ? "Play dragon animation" : "Pause dragon animation"}
            onClick={() => setPaused((v) => !v)}
            title={reduced ? "Animation paused by reduced motion preference" : undefined}
            aria-pressed={paused || reduced}
          >
            {paused || reduced ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            disabled={status !== "ready"}
            aria-label="Reset dragon view"
            onClick={() => {
              setMotion("Fly Hover");
              controller.current?.reset();
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            disabled={status !== "ready"}
            aria-label="Rotate dragon right"
            onClick={() => controller.current?.rotate(0.5)}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="dragon-caption">
        <span>
          {reduced ? "Still view · reduced motion" : "A living guardian. Your world to explore."}
        </span>
        <a href="https://afk.ai/auto-rig/dragon" target="_blank" rel="noopener noreferrer">
          Dragon · afk.ai / CC0
        </a>
      </div>
    </section>
  );
}
