import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackHome } from "./BackHome";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SiteGuide } from "./SiteGuide";

export function PageShell({ children }: { children: ReactNode }) {
  const { loading } = useSiteSettings();
  return (
    <div className="app-shell min-h-screen">
      <Header />
      <main
        id="main-content"
        aria-busy={loading}
        tabIndex={-1}
        className="page-content relative z-[var(--z-content)] min-h-[calc(100svh-5rem)]"
      >
        <BackHome />
        {children}
      </main>
      <Footer />
      <SiteGuide />
    </div>
  );
}
