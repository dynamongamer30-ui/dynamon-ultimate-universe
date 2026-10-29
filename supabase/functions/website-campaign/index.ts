// The function validates the Supabase session explicitly; do not rely on an opaque key as a JWT.
import { createCampaignHandler } from "./handler.js";
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
Deno.serve(
  createCampaignHandler({
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    TURNSTILE_SECRET_KEY: Deno.env.get("TURNSTILE_SECRET_KEY"),
    CAMPAIGN_COOKIE_SECRET: Deno.env.get("CAMPAIGN_COOKIE_SECRET"),
    CAMPAIGN_PROXY_SECRET: Deno.env.get("CAMPAIGN_PROXY_SECRET"),
    SITE_ORIGIN: "https://dynamongamer.com",
  }),
);
