import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { AuroraCursor } from "@/components/AuroraCursor";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { PWAInstall } from "@/components/PWAInstall";
import { SITE_URL, canonicalUrl, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { WebsiteThemeProvider } from "@/hooks/useWebsiteTheme";
import { WEBSITE_THEMES, WEBSITE_THEME_STORAGE } from "@/lib/websiteThemes";
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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const router = useRouter();
  // SPA-mode shell invariant: thrown during initial render for ssr:false routes.
  // Auto-recover by invalidating + resetting so client hydration takes over.
  const isSpaShellInvariant = message.includes("Expected to find a match below the root match");

  // A route's lazy chunk failing to load (stale tab after a redeploy) is
  // caught right here by the router's own error boundary — it never reaches
  // window-level 'error'/'unhandledrejection' listeners, so deployFreshness's
  // guard alone can't catch it. Handle it the same way: reload once, silently.
  const isStaleChunk = STALE_CHUNK_PATTERN.test(message);

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
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm"
          >
            Go home
          </a>
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
      {
        name: "description",
        content:
          "Compare Dynamons World builds by feature set, version, element, ratings, and community signals. Explore release notes, rewards, and guided unlock access.",
      },
      { name: "author", content: "Dynamon Universe" },
      { name: "theme-color", content: "#171020" },
      { name: "color-scheme", content: "dark" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      {
        property: "og:title",
        content: "Dynamon Universe — Dynamons World Builds, Guides & Rewards",
      },
      {
        property: "og:description",
        content:
          "Compare Dynamons World builds by feature set, version, element, ratings, and community signals.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Dynamon Universe" },
      { property: "og:image", content: canonicalUrl("/site-preview") },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: canonicalUrl("/site-preview") },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
    ],
    scripts: [
      organizationJsonLd(),
      websiteJsonLd(),
      {
        children: `try{const t=localStorage.getItem(${JSON.stringify(WEBSITE_THEME_STORAGE)});if(${JSON.stringify(WEBSITE_THEMES.map((theme) => theme.id))}.includes(t))document.documentElement.dataset.websiteTheme=t}catch{}`,
      },
    ],
    links: [
      { rel: "icon", href: "/site-icon" },
      { rel: "apple-touch-icon", href: "/site-icon" },
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
    <html lang="en" data-website-theme="royal-black" suppressHydrationWarning>
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
  const reducedMotion = useReducedMotionPreference();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      className="page-transition"
      key={pathname}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteSettingsProvider>
          <WebsiteThemeProvider>
            <GamificationProvider>
              <ConfirmProvider>
                <MotionConfig reducedMotion="user">
                  <a
                    href="#main-content"
                    tabIndex={0}
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold focus:text-primary-foreground"
                  >
                    Skip to content
                  </a>
                  <AuroraCursor />
                  <AnnouncementBanner />
                  <OwnerReturnRedirect />
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                  <Toaster
                    theme="dark"
                    position="bottom-right"
                    visibleToasts={1}
                    toastOptions={{
                      className: "site-toast",
                      duration: 4200,
                    }}
                  />
                  <NotificationOptIn />
                  <PWAInstall />
                  <DailyCheckIn />
                </MotionConfig>
              </ConfirmProvider>
            </GamificationProvider>
          </WebsiteThemeProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
