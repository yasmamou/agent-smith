/**
 * Credential hygiene helpers.
 * Agent Smith never stores login/password/apiKey in clear and never logs them.
 */

export function maskSecret(value?: string | null): string {
  if (!value) return "";
  if (value.length <= 4) return "•".repeat(value.length);
  return value.slice(0, 2) + "•".repeat(Math.max(4, value.length - 4)) + value.slice(-2);
}

/** Strip any credential-like fields before logging an object. */
export function redact<T extends Record<string, unknown>>(obj: T): T {
  const SENSITIVE = ["password", "apikey", "api_key", "token", "secret", "login", "passwordhash"];
  const out = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    if (SENSITIVE.includes(k.toLowerCase())) out[k] = out[k] ? "[redacted]" : out[k];
  }
  return out as T;
}
