import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { AuroraBackground } from "@/components/AuroraBackground";
import { AuroraCursor } from "@/components/AuroraCursor";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { PWAInstall } from "@/components/PWAInstall";
import { SITE_URL, canonicalUrl, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { GamificationProvider } from "@/hooks/useGamification";
import { OwnerReturnRedirect } from "@/components/OwnerReturnRedirect";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { STALE_CHUNK_PATTERN, reloadOnce } from "@/lib/deployFreshness";

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

  // A route's lazy chunk failing to load (stale tab after a redeploy) is
  // caught right here by the router's own error boundary — it never reaches
  // window-level 'error'/'unhandledrejection' listeners, so deployFreshness's
  // guard alone can't catch it. Handle it the same way: reload once, silently.
  const isStaleChunk =
    typeof error?.message === "string" && STALE_CHUNK_PATTERN.test(error.message);

  useEffect(() => {
    if (isSpaShellInvariant) {
      router.invalidate();
      reset();
      return;
    }
    if (isStaleChunk) {
      reloadOnce();
      return;
    }
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error, isSpaShellInvariant, isStaleChunk, router, reset]);

  if (isSpaShellInvariant || isStaleChunk) {
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
      { title: "Dynamon Universe — Dynamons World Builds, Guides & Rewards" },
      { name: "description", content: "Compare Dynamons World builds by feature set, version, element, ratings, and community signals. Explore release notes, rewards, and guided unlock access." },
      { name: "author", content: "Dynamon Universe" },
      { name: "theme-color", content: "#171020" },
      { name: "color-scheme", content: "dark" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { property: "og:title", content: "Dynamon Universe — Dynamons World Builds, Guides & Rewards" },
      { property: "og:description", content: "Compare Dynamons World builds by feature set, version, element, ratings, and community signals." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Dynamon Universe" },
      { property: "og:image", content: canonicalUrl("/dynamon-gamer-avatar.png") },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    ],
    scripts: [organizationJsonLd(), websiteJsonLd()],
    links: [
      { rel: "preload", href: "/fonts/aeonik-pro/AeonikPro-Bold.woff", as: "font", type: "font/woff", crossOrigin: "anonymous" },
      { rel: "icon", href: "/dynamon-gamer-avatar.png", sizes: "256x256", type: "image/png" },
      { rel: "apple-touch-icon", href: "/dynamon-gamer-avatar.png", sizes: "256x256" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
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

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showAmbientField = pathname === "/";
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteSettingsProvider>
          <GamificationProvider>
            <ConfirmProvider>
            {showAmbientField && <AuroraBackground />}
            <AuroraCursor />
            <AnnouncementBanner />
            <OwnerReturnRedirect />
            <PageTransition><Outlet /></PageTransition>
            <NotificationOptIn />
            <PWAInstall />
            <DailyCheckIn />
            </ConfirmProvider>
          </GamificationProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
