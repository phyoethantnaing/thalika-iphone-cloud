import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const sessionCookie = "thalika_session";
export const sessionSeconds = 12 * 60 * 60;
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function configured() {
  return Boolean(process.env.OWNER_PASSWORD_HASH && (process.env.SESSION_SECRET?.length || 0) >= 32);
}
export function checkPassword(password: string) {
  const [salt, expected] = (process.env.OWNER_PASSWORD_HASH || "").split(":");
  if (!salt || !/^[a-f0-9]{128}$/.test(expected || "")) return false;
  return equal(scryptSync(password, salt, 64).toString("hex"), expected);
}
const sign = (payload: string) => createHmac("sha256", process.env.SESSION_SECRET || "").update(payload).digest("hex");
export function newSession() {
  const payload = `${Date.now() + sessionSeconds * 1000}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}
export function validSession(token?: string) {
  if (!configured() || !token || token.length > 256) return false;
  const [expires, nonce, signature] = token.split(".");
  return /^\d+$/.test(expires) && /^[a-f0-9]{48}$/.test(nonce || "") &&
    Number(expires) > Date.now() && Number(expires) <= Date.now() + sessionSeconds * 1000 &&
    equal(signature || "", sign(`${expires}.${nonce}`));
}
export function validInternal(token: string | null) {
  const secret = process.env.RUNTIME_TOKEN || "";
  return secret.length >= 32 && equal(token || "", `Bearer ${secret}`);
}
export function allowedOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}

// One owner / one Node replica. Global buckets cannot be bypassed using forged IP headers.
const buckets = new Map<string, { until: number; count: number }>();
export function allowRequest(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) { bucket = { until: now + windowMs, count: 0 }; buckets.set(key, bucket); }
  return ++bucket.count <= limit;
}
