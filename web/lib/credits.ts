import { createHash, randomBytes } from "node:crypto";
import { abuseStore, AbuseError, visitorIdentity } from "./abuse.ts";

export const codeKey = (code: string) => `redeem:${createHash("sha256").update(code.trim().toUpperCase()).digest("hex")}`;
export async function createRedeemCode(credits: unknown, maxUses: unknown, days: unknown) {
  if (!Number.isInteger(credits) || Number(credits) < 1 || Number(credits) > 1000 || !Number.isInteger(maxUses) || Number(maxUses) < 1 || Number(maxUses) > 1000 || !Number.isInteger(days) || Number(days) < 1 || Number(days) > 365) throw new AbuseError("Kredit/pemakaian harus 1–1000 dan masa berlaku 1–365 hari.", 400, 0, "INVALID_CODE_SETTINGS");
  const code = `FOTO-${randomBytes(8).toString("hex").toUpperCase()}`;
  const key = codeKey(code);
  const expiresAt = Date.now() + Number(days) * 86400000;
  const store = await abuseStore();
  await store.multi().hSet(key, { code, credits: String(credits), maxUses: String(maxUses), uses: "0", active: "1", expiresAt: String(expiresAt), createdAt: String(Date.now()) }).expire(key, Number(days) * 86400 + 86400).zAdd("redeem:index", { score: Date.now(), value: key }).exec();
  return code;
}
export async function listRedeemCodes() {
  const store = await abuseStore();
  const keys = await store.zRange("redeem:index", 0, 99, { REV: true });
  const codes = await Promise.all(keys.map(async (key) => ({ key, ...await store.hGetAll(key) })));
  return codes.filter((entry) => "code" in entry);
}
const redeemScript = `
if redis.call('HGET', KEYS[1], 'active') ~= '1' then return -1 end
if tonumber(redis.call('HGET', KEYS[1], 'expiresAt') or '0') <= tonumber(ARGV[1]) then return -1 end
if redis.call('SISMEMBER', KEYS[2], ARGV[2]) == 1 then return -2 end
if tonumber(redis.call('HGET', KEYS[1], 'uses') or '0') >= tonumber(redis.call('HGET', KEYS[1], 'maxUses') or '0') then return -1 end
local credits = tonumber(redis.call('HGET', KEYS[1], 'credits'))
redis.call('HINCRBY', KEYS[1], 'uses', 1)
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[2], 31622400)
return redis.call('INCRBY', KEYS[3], credits)`;
export async function redeemCredits(req: Request, code: unknown) {
  if (typeof code !== "string" || !/^FOTO-[A-F0-9]{16}$/i.test(code.trim())) throw new AbuseError("Kode redeem tidak valid.", 400, 0, "INVALID_REDEEM_CODE");
  const identity = visitorIdentity(req);
  const key = codeKey(code);
  const balance = Number(await (await abuseStore()).eval(redeemScript, { keys: [key, `${key}:users`, `credits:${identity.browser}`], arguments: [String(Date.now()), identity.browser] }));
  if (balance === -1) throw new AbuseError("Kode tidak aktif, kedaluwarsa, atau sudah habis.", 400, 0, "CODE_UNAVAILABLE");
  if (balance === -2) throw new AbuseError("Kode ini sudah kamu gunakan.", 409, 0, "CODE_ALREADY_USED");
  return { balance, cookie: identity.cookie };
}
