import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { AuroraBackground } from "@/components/AuroraBackground";
import { AuroraCursor } from "@/components/AuroraCursor";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { PWAInstall } from "@/components/PWAInstall";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { GamificationProvider } from "@/hooks/useGamification";
import { OwnerReturnRedirect } from "@/components/OwnerReturnRedirect";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the Dynamon realm</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for has wandered off into the wild.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
            style={{ background: "var(--gradient-primary)" }}
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  // SPA-mode shell invariant: thrown during initial render for ssr:false routes.
  // Auto-recover by invalidating + resetting so client hydration takes over.
  const isSpaShellInvariant =
    typeof error?.message === "string" &&
    error.message.includes("Expected to find a match below the root match");

  useEffect(() => {
    if (isSpaShellInvariant) {
      router.invalidate();
      reset();
      return;
    }
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error, isSpaShellInvariant, router, reset]);

  if (isSpaShellInvariant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something glitched</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try refreshing the page.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dynamon Universe — Dynamons World Mod APK Hub" },
      { name: "description", content: "Dynamon Universe is a fan-made hub dedicated only to Dynamons World mod APKs. Premium builds, community ratings, and weekly drops." },
      { name: "author", content: "Dynamon Universe" },
      { name: "theme-color", content: "#0c1f17" },
      { property: "og:title", content: "Dynamon Universe — Dynamons World Mod APK Hub" },
      { property: "og:description", content: "Premium fan-made Dynamons World mod builds with community ratings, reviews and weekly drops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteSettingsProvider>
          <GamificationProvider>
            <AuroraBackground />
            <AuroraCursor />
            <AnnouncementBanner />
            <OwnerReturnRedirect />
            <Outlet />
            <NotificationOptIn />
            <PWAInstall />
            <DailyCheckIn />
          </GamificationProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
