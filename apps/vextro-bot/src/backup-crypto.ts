import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

type Envelope = { version: 1; algorithm: "aes-256-gcm"; salt: string; iv: string; tag: string; ciphertext: string };

export function encryptBackupPayload(plain: Buffer, passphrase: string): Buffer {
  if (passphrase.length < 16) throw new Error("Backup passphrase must contain at least 16 characters");
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const envelope: Envelope = {
    version: 1, algorithm: "aes-256-gcm", salt: salt.toString("hex"), iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"), ciphertext: ciphertext.toString("base64")
  };
  return Buffer.from(JSON.stringify(envelope));
}
export function decryptBackupPayload(raw: Buffer, passphrase: string): Buffer {
  if (passphrase.length < 16) throw new Error("Backup passphrase must contain at least 16 characters");
  const envelope = JSON.parse(raw.toString("utf8")) as Envelope;
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported backup format");
  const key = scryptSync(passphrase, Buffer.from(envelope.salt, "hex"), 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "hex"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
}
