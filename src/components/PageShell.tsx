import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackHome } from "./BackHome";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SiteGuide } from "./SiteGuide";

const BANNER_KEY = "53af59153c6ecd986cfba3273ea2121a";
const BANNER_SRC = "https://bellnewyork.org/22/53af59153c6ecd986cfba3273ea2121a";
const NATIVE_ID = "container-28bb73ad4fb6048c2aa71226ea015625";
const NATIVE_SRC = "https://bellnewyork.org/21/28bb73ad4fb6048c2aa71226ea015625";

// The 728x90 banner script uses document.write, so it has to run inside an
// iframe (injecting it straight from React would break it). Hidden on phones
// because 728px does not fit a narrow screen.
function AdBanner728({ className = "" }: { className?: string }) {
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>` +
      `<script>atOptions={'key':'${BANNER_KEY}','format':'iframe','height':90,'width':728,'params':{}};<\/script>` +
      `<script src="${BANNER_SRC}"><\/script></body></html>`,
    [],
  );
  return (
    <div className={`hidden justify-center md:flex ${className}`}>
      <iframe
        title="Advertisement"
        srcDoc={srcDoc}
        width={728}
        height={90}
        scrolling="no"
        frameBorder={0}
        style={{ border: 0, maxWidth: "100%" }}
      />
    </div>
  );
}

// Native banner: the container div must exist first, then the async script is
// appended. Use only one per page (the container id is fixed by the ad network).
function AdNativeBanner({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = NATIVE_SRC;
    el.appendChild(script);
    return () => el.replaceChildren();
  }, []);
  return <div ref={ref} id={NATIVE_ID} className={className} />;
}

export function PageShell({ children }: { children: ReactNode }) {
  const { loading } = useSiteSettings();
  return (
    <div className="app-shell min-h-screen">
      <Header />
      <main
        id="main-content"
        aria-busy={loading}
        tabIndex={-1}
        className="page-content relative z-[var(--z-content)] mx-auto min-h-[calc(100svh-5rem)] max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8"
      >
        <BackHome />
        <AdBanner728 className="mb-6" />
        {children}
        <AdNativeBanner className="mt-12" />
      </main>
      <Footer />
      <SiteGuide />
    </div>
  );
}
