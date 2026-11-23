import { describe, expect, it } from "vitest";
import { decryptBackupPayload, encryptBackupPayload } from "../src/backup-crypto.js";

describe("encrypted VEXTRO backup payloads", () => {
  const passphrase = "vextro-test-passphrase-2026";

  it("round-trips payloads with AES-256-GCM", () => {
    const original = Buffer.from(JSON.stringify({ users: [{ telegram_id: 42 }], createdAt: "2026-11-23T00:00:00Z" }));
    const encrypted = encryptBackupPayload(original, passphrase);
    expect(encrypted.equals(original)).toBe(false);
    expect(decryptBackupPayload(encrypted, passphrase).equals(original)).toBe(true);
  });

  it("uses fresh salt and IV for each backup", () => {
    const original = Buffer.from("same content");
    const first = encryptBackupPayload(original, passphrase);
    const second = encryptBackupPayload(original, passphrase);
    expect(first.equals(second)).toBe(false);
  });

  it("rejects wrong passphrases and tampered ciphertext", () => {
    const encrypted = encryptBackupPayload(Buffer.from("sensitive backup"), passphrase);
    expect(() => decryptBackupPayload(encrypted, "wrong-passphrase-2026")).toThrow();
    const parsed = JSON.parse(encrypted.toString("utf8")) as { ciphertext: string };
    parsed.ciphertext = parsed.ciphertext.slice(0, -4) + "AAAA";
    expect(() => decryptBackupPayload(Buffer.from(JSON.stringify(parsed)), passphrase)).toThrow();
  });

  it("rejects weak passphrases", () => {
    expect(() => encryptBackupPayload(Buffer.from("data"), "short")).toThrow(/16 characters/);
  });
});
