import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config-schema.js";

const validEnvironment = () => ({
  BOT_TOKEN: "12345678901234567890",
  OWNER_TELEGRAM_ID: "123456789",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "s".repeat(40),
  WEBSITE_URL: "https://example.com",
  REQUIRED_CHANNEL_ID: "@vextro_channel",
  REQUIRED_GROUP_ID: "-1001234567890"
});

describe("VEXTRO bot configuration contract", () => {
  it("accepts the required configuration and defaults", () => {
    const parsed = parseConfig(validEnvironment());
    expect(parsed.OWNER_TELEGRAM_ID).toBe(123456789);
    expect(parsed.BACKUP_BUCKET).toBe("vextro-backups");
    expect(parsed.OWNER_TIMEZONE).toBe("Asia/Kolkata");
    expect(parsed.UPDATE_CHECK_INTERVAL_HOURS).toBe(6);
  });

  it("treats blank optional .env values as unset", () => {
    const parsed = parseConfig({
      ...validEnvironment(),
      PUBLISH_CHANNEL_ID: "",
      BOT_PUBLIC_USERNAME: "",
      BACKUP_PASSPHRASE: "",
      BACKUP_OFFSITE_URL: "",
      BACKUP_OFFSITE_TOKEN: "",
      DEPLOY_WEBHOOK_URL: "",
      DEPLOY_WEBHOOK_SECRET: ""
    });
    expect(parsed.PUBLISH_CHANNEL_ID).toBeUndefined();
    expect(parsed.BOT_PUBLIC_USERNAME).toBeUndefined();
    expect(parsed.BACKUP_PASSPHRASE).toBeUndefined();
    expect(parsed.BACKUP_OFFSITE_URL).toBeUndefined();
    expect(parsed.DEPLOY_WEBHOOK_URL).toBeUndefined();
  });

  it("requires offsite credentials as a pair and requires HTTPS", () => {
    expect(() => parseConfig({
      ...validEnvironment(),
      BACKUP_OFFSITE_URL: "https://backup.example.com"
    })).toThrow(/BACKUP_OFFSITE_TOKEN/);
    expect(() => parseConfig({
      ...validEnvironment(),
      BACKUP_OFFSITE_URL: "http://backup.example.com",
      BACKUP_OFFSITE_TOKEN: "t".repeat(20),
      BACKUP_PASSPHRASE: "long-enough-passphrase"
    })).toThrow(/BACKUP_OFFSITE_URL/);
  });

  it("requires a numeric group ID, valid timezone and HTTPS invite URLs", () => {
    expect(() => parseConfig({ ...validEnvironment(), REQUIRED_GROUP_ID: "@group" })).toThrow(/REQUIRED_GROUP_ID/);
    expect(() => parseConfig({ ...validEnvironment(), OWNER_TIMEZONE: "Mars/Olympus" })).toThrow(/OWNER_TIMEZONE/);
    expect(() => parseConfig({ ...validEnvironment(), REQUIRED_GROUP_URL: "http://t.me/privateinvite" })).toThrow(/REQUIRED_GROUP_URL/);
  });

  it("requires paired deployment credentials and encrypted backups", () => {
    expect(() => parseConfig({ ...validEnvironment(), DEPLOY_WEBHOOK_URL: "https://deploy.example.com" })).toThrow(/DEPLOY_WEBHOOK_SECRET/);
    expect(() => parseConfig({
      ...validEnvironment(),
      DEPLOY_WEBHOOK_URL: "https://deploy.example.com",
      DEPLOY_WEBHOOK_SECRET: "d".repeat(24)
    })).toThrow(/BACKUP_PASSPHRASE/);
  });
});
