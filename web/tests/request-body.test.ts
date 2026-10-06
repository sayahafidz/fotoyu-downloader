import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../lib/request-body.ts";
import { checkSameOrigin } from "../lib/abuse.ts";

test("JSON reader rejects unsupported content, non-objects and oversized bodies", async () => {
  const request = (body: string, type = "application/json") => new Request("https://app.example/api", { method: "POST", headers: { "Content-Type": type }, body });
  await assert.rejects(readJsonBody(request("{}", "text/plain")), /Content-Type/);
  await assert.rejects(readJsonBody(request("null")), /objek JSON/);
  await assert.rejects(readJsonBody(request("[]")), /objek JSON/);
  await assert.rejects(readJsonBody(request(JSON.stringify({ data: "x".repeat(100) })), 50), /terlalu besar/);
  assert.deepEqual(await readJsonBody(request('{"code":"test"}')), { code: "test" });
});
test("mutating requests require the configured origin, not an attacker-controlled host", () => {
  process.env.APP_ORIGIN = "https://app.example";
  assert.throws(() => checkSameOrigin(new Request("https://app.example/api")), /aplikasi ini/);
  assert.throws(() => checkSameOrigin(new Request("https://evil.example/api", { headers: { origin: "https://evil.example" } })), /aplikasi ini/);
  assert.doesNotThrow(() => checkSameOrigin(new Request("http://internal:3000/api", { headers: { origin: "https://app.example" } })));
});
