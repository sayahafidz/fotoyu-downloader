import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "redis";

let client: ReturnType<typeof createClient> | undefined;
let connecting: Promise<unknown> | undefined;

export async function abuseStore() {
  const url = process.env.REDIS_URL || (process.env.NODE_ENV === "development" ? "redis://127.0.0.1:6379" : undefined);
  if (!url) throw new Error("REDIS_URL belum dikonfigurasi.");
  if (!client) {
    client = createClient({ url, socket: { connectTimeout: 3000, reconnectStrategy: false }, disableOfflineQueue: true });
    client.on("error", () => {});
  }
  if (!client.isReady) {
    connecting ||= (client.isOpen ? Promise.reject(new Error("Redis belum siap.")) : client.connect()).finally(() => { connecting = undefined; });
    await connecting;
  }
  return client;
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const COOKIE = "fotoyu_visitor";

export function visitorIdentity(req: Request) {
  // The trusted reverse proxy must overwrite this header, never append client input.
  const forwarded = process.env.TRUST_PROXY === "true" ? req.headers.get("x-real-ip")?.trim() : undefined;
  const ip = forwarded && isIP(forwarded) ? forwarded : "unknown";
  const existing = req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const id = existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : randomUUID();
  return {
    browser: digest(id), ip: digest(ip),
    cookie: `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" ? "; Secure" : ""}`,
  };
}

export function dailyWindow(now = Date.now()) {
  const offset = 7 * 60 * 60 * 1000;
  const day = Math.floor((now + offset) / 86400000);
  const resetsAt = (day + 1) * 86400000 - offset;
  return { day, resetsAt, seconds: Math.max(1, Math.ceil((resetsAt - now) / 1000)) };
}

export class AbuseError extends Error {
  readonly status: number;
  readonly retryAfter: number;
  readonly code: string;
  constructor(message: string, status: number, retryAfter = 60, code = "RATE_LIMITED") {
    super(message); this.status = status; this.retryAfter = retryAfter; this.code = code;
  }
}

const rateScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current >= tonumber(ARGV[1]) then return {0, redis.call('TTL', KEYS[1])} end
local next = redis.call('INCR', KEYS[1])
if next == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return {1, redis.call('TTL', KEYS[1])}`;

export async function rateLimit(req: Request, scope: string, limit: number, seconds = 60) {
  const store = await abuseStore();
  const identity = visitorIdentity(req);
  const result = await store.eval(rateScript, { keys: [`rate:${scope}:${identity.ip}`], arguments: [String(limit), String(seconds)] }) as number[];
  if (!result[0]) throw new AbuseError("Terlalu banyak permintaan. Coba lagi setelah jeda.", 429, Math.max(1, result[1]));
}

export function checkSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin && origin !== process.env.APP_ORIGIN)) {
    throw new AbuseError("Permintaan harus berasal dari aplikasi ini.", 403, 0, "ORIGIN_REJECTED");
  }
}

function quotaKeys(req: Request) {
  const identity = visitorIdentity(req);
  const window = dailyWindow();
  return { identity, window, keys: [`quota:${window.day}:browser:${identity.browser}`, `quota:${window.day}:ip:${identity.ip}`] };
}

export async function watermarkQuota(req: Request) {
  const store = await abuseStore();
  const { identity, window, keys } = quotaKeys(req);
  const counts = await store.mGet(keys);
  const used = Math.max(...counts.map((count) => Number(count || 0)));
  return { limit: 5, remaining: Math.max(0, 5 - used), resetsAt: new Date(window.resetsAt).toISOString(), cookie: identity.cookie };
}

const reserveScript = `
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)
if redis.call('EXISTS', KEYS[4]) == 1 then return -2 end
if redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[4]) then return -2 end
for i=1,2 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= 5 then return -1 end
end
for i=1,2 do
  local n = redis.call('INCR', KEYS[i])
  if n == 1 then redis.call('EXPIRE', KEYS[i], ARGV[2]) end
end
redis.call('SET', KEYS[4], ARGV[3], 'EX', 180)
redis.call('ZADD', KEYS[3], now + 180000, ARGV[3])
redis.call('EXPIRE', KEYS[3], 180)
return 1`;

const finishScript = `
if redis.call('GET', KEYS[4]) == ARGV[1] then redis.call('DEL', KEYS[4]) end
redis.call('ZREM', KEYS[3], ARGV[1])
if ARGV[2] == '0' then
  for i=1,2 do
    if tonumber(redis.call('GET', KEYS[i]) or '0') > 0 then redis.call('DECR', KEYS[i]) end
  end
end
return 1`;

export async function reserveWatermark(req: Request) {
  const store = await abuseStore();
  const { identity, window, keys } = quotaKeys(req);
  const lease = randomUUID();
  const allKeys = [...keys, "watermark:active", `watermark:lock:${identity.ip}`];
  const concurrency = Math.max(1, Math.min(16, Number(process.env.WATERMARK_CONCURRENCY) || 2));
  const result = Number(await store.eval(reserveScript, { keys: allKeys, arguments: [String(Date.now()), String(window.seconds), lease, String(concurrency)] }));
  if (result === -1) throw new AbuseError("Kuota 5 foto hari ini habis. Coba lagi besok pukul 00.00 WIB.", 429, window.seconds, "DAILY_QUOTA_EXCEEDED");
  if (result === -2) throw new AbuseError("Pemrosesan sedang berlangsung. Tunggu sebentar lalu coba lagi.", 429, 10, "PROCESSING_BUSY");
  let finished = false;
  return {
    cookie: identity.cookie,
    async finish(success: boolean) {
      if (finished) return;
      await store.eval(finishScript, { keys: allKeys, arguments: [lease, success ? "1" : "0"] });
      finished = true;
    },
  };
}

export function abuseResponse(error: unknown) {
  if (error instanceof AbuseError) return Response.json({ error: error.message, code: error.code, fallback: "original" }, { status: error.status, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } });
  console.error("[abuse] rate-limit store unavailable");
  return Response.json({ error: "Layanan sementara tidak tersedia. Coba lagi nanti.", code: "LIMITER_UNAVAILABLE", fallback: "original" }, { status: 503, headers: { "Retry-After": "30", "Cache-Control": "no-store" } });
}
