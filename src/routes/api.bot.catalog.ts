import { createFileRoute } from "@tanstack/react-router";
import { botCatalogResponse } from "@/lib/botCatalog.server";

export const Route = createFileRoute("/api/bot/catalog")({
  server: { handlers: { GET: () => botCatalogResponse() } },
});
