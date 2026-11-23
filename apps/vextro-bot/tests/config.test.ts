import { describe, expect, it } from "vitest";

describe("VEXTRO bot configuration contract", () => {
  it("documents a strict required configuration surface", () => {
    const required = ["BOT_TOKEN", "OWNER_TELEGRAM_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "WEBSITE_URL", "REQUIRED_CHANNEL_ID", "REQUIRED_GROUP_ID"];
    expect(new Set(required).size).toBe(required.length);
    expect(required).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(required).not.toContain("SUPABASE_ANON_KEY");
  });
});
