import { describe, expect, it } from "vitest";
import { formatOwnerDateTime, parseOwnerDateTime } from "../src/time.js";

describe("Owner timezone scheduling", () => {
  it("converts local Owner time to UTC", () => {
    expect(parseOwnerDateTime("2026-11-23 19:30", "Asia/Kolkata").toISOString()).toBe("2026-11-23T14:00:00.000Z");
  });
  it("accepts ISO timestamps with an explicit offset", () => {
    expect(parseOwnerDateTime("2026-11-23T19:30:00+05:30", "Asia/Kolkata").toISOString()).toBe("2026-11-23T14:00:00.000Z");
  });
  it("formats stored UTC timestamps in the Owner timezone", () => {
    expect(formatOwnerDateTime("2026-11-23T14:00:00.000Z", "Asia/Kolkata")).toContain("19:30");
  });
  it("rejects invalid calendar values and nonexistent DST local times", () => {
    expect(() => parseOwnerDateTime("2026-02-31 12:00", "Asia/Kolkata")).toThrow();
    expect(() => parseOwnerDateTime("2026-03-08 02:30", "America/New_York")).toThrow(/daylight-saving/);
  });
});
