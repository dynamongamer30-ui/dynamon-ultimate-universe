import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, ChevronDown, VolumeX } from "lucide-react";
import { useFeedbackPreferences } from "@/hooks/useFeedbackPreferences";
import type { FeedbackPreference } from "@/lib/sound";

const options: Array<{ value: FeedbackPreference; label: string; description: string }> = [
  { value: "full", label: "Full", description: "Sound and haptics" },
  { value: "reduced", label: "Reduced", description: "Success/error haptics only" },
  { value: "off", label: "Off", description: "No optional feedback" },
];

export function FeedbackPreferences() {
  const { preference, setPreference } = useFeedbackPreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === preference) ?? options[0];

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="touch-target press grid place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-[color,border-color,box-shadow] hover:border-primary/55 hover:text-foreground"
        aria-label={`Feedback preference: ${current.label}`}
        aria-expanded={open}
        aria-controls="feedback-preferences-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {preference === "off" ? <VolumeX className="h-4 w-4" /> : <AudioLines className="h-4 w-4" />}
      </button>
      {open && (
        <div
          id="feedback-preferences-panel"
          role="dialog"
          aria-label="Feedback preferences"
          className="absolute right-0 z-[var(--z-popover)] mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border/70 bg-card p-3 shadow-elev glass-l3"
        >
          <div className="flex items-start justify-between gap-3 px-1 pb-2">
            <div>
              <p className="text-sm font-semibold">Feedback</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Optional sound and haptics</p>
            </div>
            <ChevronDown className="mt-0.5 h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="grid gap-1" role="radiogroup" aria-label="Feedback preference">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={preference === option.value}
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setPreference(option.value)}
              >
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
                {preference === option.value && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
