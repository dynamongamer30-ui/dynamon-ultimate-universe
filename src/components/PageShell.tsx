import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackHome } from "./BackHome";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <Header />
      <main className="page-content mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <BackHome />
        {children}
      </main>
      <Footer />
    </div>
  );
}
