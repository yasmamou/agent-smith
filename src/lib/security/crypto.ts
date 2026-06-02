import crypto from "node:crypto";

/**
 * Symmetric encryption for short-lived test credentials (authenticated audits).
 * Key derived from AUTH_SECRET. Credentials are encrypted at rest, decrypted
 * only in-memory at run time, and can be cleared after the run. They are never
 * stored or logged in clear.
 */
function key() {
  return crypto.createHash("sha256").update(process.env.AUTH_SECRET || "dev-secret").digest();
}

export function encryptJson(obj: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson<T>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  try {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    return JSON.parse(dec) as T;
  } catch {
    return null;
  }
}
