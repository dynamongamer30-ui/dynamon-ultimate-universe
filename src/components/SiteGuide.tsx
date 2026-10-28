import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Heart, KeyRound, X } from "lucide-react";
import "./site-chrome.css";

const OPEN_GUIDE = "dg:open-site-guide";
const PROGRESS_KEY = "dg-site-guide-step-v1";
export function openSiteGuide() {
  window.dispatchEvent(new Event(OPEN_GUIDE));
}

const STEPS = [
  {
    icon: Compass,
    label: "Discover",
    title: "Find your next build.",
    text: "Explore the collection and compare feature notes, versions, and community feedback before choosing your edition.",
    to: "/mods" as const,
    action: "Explore builds",
  },
  {
    icon: KeyRound,
    label: "Download",
    title: "Follow the build’s download flow.",
    text: "Open a build to review its details. Sign in when asked, then use its Download action and follow the steps shown. The guide never skips access or verification steps.",
    to: "/mods" as const,
    action: "Choose a build",
  },
  {
    icon: Heart,
    label: "Save",
    title: "Keep your favorites close.",
    text: "Use the heart or bookmark controls on builds you care about. Your saved collection stays connected to your signed-in profile.",
    to: "/favorites" as const,
    action: "Open favorites",
  },
  {
    icon: BookOpen,
    label: "Stay connected",
    title: "Your journey, in one place.",
    text: "Find account settings, notifications, and rewards in the menu. Change your website theme or feedback preferences there, too. You can reopen this guide at any time.",
    to: "/rewards" as const,
    action: "Explore rewards",
  },
];

/** Optional, structured help. Native dialog supplies modal focus/escape semantics. */
export function SiteGuide() {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const open = () => {
      if (dialog.current?.open) return;
      returnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      let saved = 0;
      try {
        saved = Number(localStorage.getItem(PROGRESS_KEY) || 0);
      } catch {
        /* use first step */
      }
      setStep(Number.isInteger(saved) && saved >= 0 && saved < STEPS.length ? saved : 0);
      dialog.current?.showModal();
      heading.current?.focus();
    };
    window.addEventListener(OPEN_GUIDE, open);
    return () => window.removeEventListener(OPEN_GUIDE, open);
  }, []);

  const close = () => dialog.current?.close();
  const move = (next: number) => {
    setStep(next);
    try {
      localStorage.setItem(PROGRESS_KEY, String(next));
    } catch {
      /* storage is optional */
    }
    heading.current?.focus();
  };
  const current = STEPS[step];
  const Icon = current.icon;
  return (
    <dialog
      ref={dialog}
      className="site-guide"
      aria-labelledby="site-guide-title"
      aria-describedby="site-guide-description"
      onClose={() => {
        if (returnFocus.current?.isConnected) returnFocus.current.focus();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <div className="site-guide-top">
        <span>
          <Compass size={16} aria-hidden="true" /> Your field guide
        </span>
        <button type="button" onClick={close} aria-label="Close guide">
          <X size={20} />
        </button>
      </div>
      <div className="site-guide-body">
        <div className="site-guide-emblem">
          <Icon size={30} aria-hidden="true" />
        </div>
        <p className="site-guide-eyebrow">
          {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")} ·{" "}
          {current.label}
        </p>
        <h2 id="site-guide-title" ref={heading} tabIndex={-1}>
          {current.title}
        </h2>
        <p id="site-guide-description">{current.text}</p>
        <Link to={current.to} onClick={close} className="site-guide-link">
          {current.action}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="site-guide-progress" aria-label={`Guide step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((item, index) => (
          <span key={item.label} data-complete={index <= step} />
        ))}
      </div>
      <div className="site-guide-bottom">
        <button
          type="button"
          className="site-guide-secondary"
          onClick={() => (step ? move(step - 1) : close())}
        >
          {step ? (
            <>
              <ArrowLeft size={16} /> Back
            </>
          ) : (
            "Skip guide"
          )}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="site-guide-next" onClick={() => move(step + 1)}>
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="site-guide-next"
            onClick={() => {
              move(0);
              close();
            }}
          >
            Done <Check size={16} />
          </button>
        )}
      </div>
      {step > 0 && (
        <button type="button" className="site-guide-replay" onClick={() => move(0)}>
          Start again
        </button>
      )}
    </dialog>
  );
}
