import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_SALT = Buffer.from("skootly-invalid-credential-salt");
const DUMMY_HASH = Buffer.alloc(KEY_LENGTH);

function derive(password: string, salt: Buffer, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export function normalizeEmail(email: string) {
  return email.normalize("NFKC").trim().toLowerCase();
}

export function createLocalOpenId() {
  return `local_${randomUUID().replaceAll("-", "")}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encodedHash: string | null | undefined) {
  const parts = encodedHash?.split("$") ?? [];
  const validFormat = parts.length === 6 && parts[0] === "scrypt";
  const n = validFormat ? Number(parts[1]) : SCRYPT_N;
  const r = validFormat ? Number(parts[2]) : SCRYPT_R;
  const p = validFormat ? Number(parts[3]) : SCRYPT_P;
  const salt = validFormat ? Buffer.from(parts[4]!, "base64url") : DUMMY_SALT;
  const expected = validFormat ? Buffer.from(parts[5]!, "base64url") : DUMMY_HASH;
  if (![n, r, p].every(Number.isSafeInteger) || n < 2 || n > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16 || expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, salt, n, r, p);
  return timingSafeEqual(actual, expected);
}

type Attempt = { failures: number; windowStartedAt: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export function assertCredentialAttemptAllowed(key: string, now = Date.now()) {
  const state = attempts.get(key);
  if (state?.blockedUntil && state.blockedUntil > now) throw new Error("RATE_LIMITED");
  if (state && now - state.windowStartedAt >= WINDOW_MS) attempts.delete(key);
}

export function recordCredentialAttempt(key: string, succeeded: boolean, now = Date.now()) {
  if (succeeded) { attempts.delete(key); return; }
  const current = attempts.get(key);
  const next = !current || now - current.windowStartedAt >= WINDOW_MS
    ? { failures: 1, windowStartedAt: now, blockedUntil: 0 }
    : { ...current, failures: current.failures + 1 };
  if (next.failures >= MAX_FAILURES) next.blockedUntil = now + BLOCK_MS;
  attempts.set(key, next);
}

export function resetCredentialAttemptsForTests() {
  attempts.clear();
}
