import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackHome } from "./BackHome";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function PageShell({ children }: { children: ReactNode }) {
  const { loading } = useSiteSettings();
  return (
    <div className="app-shell min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main-content"
        aria-busy={loading}
        tabIndex={-1}
        className="page-content relative z-[var(--z-content)] mx-auto min-h-[calc(100svh-5rem)] max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8"
      >
        <BackHome />
        {children}
      </main>
      <Footer />
    </div>
  );
}
