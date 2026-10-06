import test from "node:test";
import assert from "node:assert/strict";
import { decodeImage, providerEndpoint, imageType, boundedBytes, providerImage } from "../lib/image-provider.ts";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
test("provider endpoints preserve custom paths and reject credentials or insecure bases", () => {
  assert.equal(providerEndpoint("https://router.example/api/v1", "chat"), "https://router.example/api/v1/chat/completions");
  assert.equal(providerEndpoint("https://api.openai.com/v1", "edits"), "https://api.openai.com/v1/images/edits");
  for (const base of ["http://localhost", "https://key@router.example", "https://router.example?secret=key"]) assert.throws(() => providerEndpoint(base, "chat"));
});
test("provider decoding accepts image formats, rejects text-only results and fake images", () => {
  const encoded = png.toString("base64");
  assert.deepEqual(decodeImage({ data: [{ b64_json: encoded }] }), png);
  assert.deepEqual(decodeImage({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${encoded}` } }] } }] }), png);
  assert.deepEqual(decodeImage({ candidates: [{ content: { parts: [{ inlineData: { data: encoded } }] } }] }), png);
  assert.throws(() => decodeImage({ choices: [{ message: { content: "Here is a description" } }] }), /image-capable/);
  assert.throws(() => imageType(Buffer.from("not an image")), /valid/);
});
test("provider responses are bounded even without a Content-Length header", async () => {
  await assert.rejects(boundedBytes(new Response(new Uint8Array(101)), 100), /terlalu besar/);
});

test("remote image results reject unapproved origins before making requests", async () => {
  await assert.rejects(providerImage({ data: [{ url: "https://unapproved.example/result.png" }] }, "https://router.example/v1/chat/completions", new AbortController().signal), /belum diizinkan/);
});
