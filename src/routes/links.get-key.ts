import { createFileRoute } from "@tanstack/react-router";
import { APK_KEY_ENTRY } from "@/lib/botCatalog";

/** Navigate only when the user presses Get Key. No token prefetch or bot-side gate. */
export const Route = createFileRoute("/links/get-key")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 302,
          headers: {
            Location: APK_KEY_ENTRY,
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
            "X-Robots-Tag": "noindex",
          },
        }),
    },
  },
});
