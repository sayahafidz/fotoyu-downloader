import test from "node:test";
import assert from "node:assert/strict";
import { extractPhotos, isAllowedHost, sanitizeFilename } from "../lib/parse.ts";

test("proxy accepts CDN hosts but rejects unsupported protocols and credentials", () => {
  assert.equal(isAllowedHost("https://cfsimgproxy.fototree.com/images/photo.jpeg"), true);
  for (const url of ["file://cdn.fotoyu.com/a", "ftp://cdn.fotoyu.com/a", "https://cdn.fotoyu.com.evil.example/a", "https://user:password@cdn.fotoyu.com/a", "https://cdn.fotoyu.com:8080/a", "http://127.0.0.1/a"]) {
    assert.equal(isAllowedHost(url), false, url);
  }
});

test("cart parsing deduplicates URLs and preserves distinct photos without product IDs", () => {
  const first = { url: "https://cdn.fotoyu.com/a.jpg", title: "photo", content_type: "photo" };
  const photos = extractPhotos(JSON.stringify({ result: { data: [first, first, { ...first, url: "https://cdn.fotoyu.com/b.jpg" }, { ...first, content_type: "video" }] } }));
  assert.equal(photos.length, 2);
  assert.notEqual(photos[0].id, photos[1].id);
  assert.deepEqual(photos.map(p => p.filename), ["photo.jpg", "photo_2.jpg"]);
});

test("parser rejects malformed carts and filenames cannot inject attachment headers", () => {
  assert.throws(() => extractPhotos("null"), /JSON tidak valid/);
  assert.throws(() => extractPhotos('{"result":{}}'), /result.data/);
  assert.equal(sanitizeFilename('foto\r\n"/\\name.jpg'), "foto_____name.jpg");
});
