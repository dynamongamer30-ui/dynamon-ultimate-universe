import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { openSiteGuide } from "./SiteGuide";

const DISMISSED_KEY = "dg-visual-beta-dismissed-v1";

/** Informational only: never blocks access or implies a service-status guarantee. */
export function BetaNotice() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      /* storage is optional */
    }
  }, []);
  if (dismissed) return null;
  return (
    <aside className="beta-notice" aria-label="Website preview notice">
      <div className="beta-notice-inner">
        <span className="beta-notice-tag">Beta</span>
        <p>Visual improvements in progress.</p>
        <button type="button" className="beta-notice-guide" onClick={openSiteGuide}>
          Quick guide <ArrowUpRight size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="beta-notice-dismiss"
          aria-label="Dismiss beta notice"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISSED_KEY, "1");
            } catch {
              /* storage is optional */
            }
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
