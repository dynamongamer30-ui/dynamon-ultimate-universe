import { describe, expect, it } from "vitest";
import { createOneTimeLinkToken, hashLinkToken, safeTokenHashEquals } from "../src/security.js";

describe("account-link token security", () => {
  it("creates a high-entropy URL-safe token and stores only a SHA-256 hash", () => {
    const first = createOneTimeLinkToken();
    const second = createOneTimeLinkToken();
    expect(first.raw).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.hash).toBe(hashLinkToken(first.raw));
    expect(first.raw).not.toBe(first.hash);
    expect(first.raw).not.toBe(second.raw);
  });

  it("compares only valid SHA-256 hashes in constant time", () => {
    const { hash } = createOneTimeLinkToken();
    expect(safeTokenHashEquals(hash, hash)).toBe(true);
    expect(safeTokenHashEquals(hash, "0".repeat(64))).toBe(false);
    expect(safeTokenHashEquals(hash, "not-a-hash")).toBe(false);
  });
});
