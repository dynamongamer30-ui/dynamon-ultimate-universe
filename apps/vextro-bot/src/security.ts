import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createOneTimeLinkToken() {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw, "utf8").digest("hex");
  return { raw, hash };
}

export function hashLinkToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function safeTokenHashEquals(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
