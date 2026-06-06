import { lookup } from "node:dns/promises";

/**
 * SSRF protection: only allow auditing public HTTP(S) targets. Blocks
 * loopback, link-local (cloud metadata 169.254.169.254), and RFC1918 private
 * ranges — checked on the hostname AND on its resolved IPs.
 */

function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/i, ""); // unwrap IPv4-mapped IPv6
  if (/^(127\.|0\.|10\.|169\.254\.|192\.168\.)/.test(v)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true;
  if (/^(::1|fc|fd|fe80|::$)/i.test(v) || v === "::") return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v)) return true; // CGNAT 100.64/10
  return false;
}

const BLOCKED_HOSTS = /^(localhost|metadata\.google\.internal|.*\.internal|.*\.local)$/i;

export async function assertPublicHttpUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("URL invalide.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Seuls http(s) sont autorisés.");
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.test(host) || isPrivateIp(host)) {
    throw new Error("Cible interne/privée interdite (protection SSRF).");
  }
  // resolve and verify the IPs are public
  try {
    const records = await lookup(host, { all: true });
    if (records.some((r) => isPrivateIp(r.address))) {
      throw new Error("La cible résout vers une adresse interne (protection SSRF).");
    }
  } catch (e) {
    if (e instanceof Error && /SSRF/.test(e.message)) throw e;
    // DNS failure → let the crawl surface "unreachable" rather than hard-block
  }
}
