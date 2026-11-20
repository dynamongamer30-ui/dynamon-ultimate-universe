import { createFileRoute } from "@tanstack/react-router";
import { HELP_TOPICS } from "@/lib/helpTopics";

export const Route = createFileRoute("/api/bot/guides")({
  server: {
    handlers: {
      GET: () => Response.json({
        schema: 1,
        categories: [
          { id: "download", title: "Download & Installation", guideIds: ["start", "downloads"] },
          { id: "activation", title: "Get Key / Activation", guideIds: ["keys", "phoenix", "history"] },
          { id: "usage", title: "Settings & Usage", guideIds: ["accounts", "discovery", "compare", "preferences", "notifications"] },
          { id: "troubleshooting", title: "Errors & Troubleshooting", guideIds: ["campaigns", "troubleshooting"] },
        ],
        guides: HELP_TOPICS,
        source: "official-website",
        updatedAt: new Date().toISOString(),
      }, {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "Content-Type": "application/json; charset=utf-8",
        },
      }),
    },
  },
});
