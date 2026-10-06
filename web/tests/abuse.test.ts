import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dailyWindow, visitorIdentity, checkSameOrigin, AbuseError, abuseStore, rateLimit, reserveWatermark, watermarkQuota } from "../lib/abuse.ts";

test("daily quota resets at midnight WIB", () => {
  const before = dailyWindow(Date.parse("2026-10-06T16:59:59Z"));
  const after = dailyWindow(Date.parse("2026-10-06T17:00:00Z"));
  assert.equal(before.seconds, 1);
  assert.equal(after.day, before.day + 1);
  assert.equal(after.seconds, 86400);
});

test("untrusted headers cannot create new IP identities and cross-origin edits are rejected", () => {
  process.env.TRUST_PROXY = "false";
  const first = visitorIdentity(new Request("https://app.example/api", { headers: { "x-real-ip": "1.2.3.4" } }));
  const second = visitorIdentity(new Request("https://app.example/api", { headers: { "x-real-ip": "5.6.7.8" } }));
  assert.equal(first.ip, second.ip);
  assert.throws(() => checkSameOrigin(new Request("https://app.example/api", { headers: { origin: "https://evil.example" } })), AbuseError);
});

test("Redis atomically limits attempts, parallel processing and daily quotas across cookies", async () => {
  const port = 16389;
  const redis = spawn("redis-server", ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"], { stdio: "pipe" });
  await new Promise<void>((resolve, reject) => {
    redis.once("error", reject);
    redis.stdout.on("data", (chunk) => { if (chunk.toString().includes("Ready to accept connections")) resolve(); });
    redis.once("exit", (code) => reject(new Error(`Redis exited ${code}`)));
  });
  process.env.REDIS_URL = `redis://127.0.0.1:${port}`;
  process.env.TRUST_PROXY = "true";
  const request = (cookie = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") => new Request("https://app.example/api", { headers: { "x-real-ip": "192.0.2.10", cookie: `fotoyu_visitor=${cookie}` } });
  try {
    const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => rateLimit(request(), "test", 3)));
    assert.equal(attempts.filter((entry) => entry.status === "fulfilled").length, 3);
    const pending = await reserveWatermark(request());
    await assert.rejects(reserveWatermark(request()), /sedang berlangsung/);
    await pending.finish(false);
    assert.equal((await watermarkQuota(request())).remaining, 5);
    for (let index = 0; index < 5; index++) {
      const reservation = await reserveWatermark(request());
      await reservation.finish(true);
    }
    assert.equal((await watermarkQuota(request())).remaining, 0);
    await assert.rejects(reserveWatermark(request()), /Kuota 5/);
    await assert.rejects(reserveWatermark(request("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")), /Kuota 5/);
  } finally {
    await (await abuseStore()).quit();
    redis.kill("SIGTERM");
  }
});
