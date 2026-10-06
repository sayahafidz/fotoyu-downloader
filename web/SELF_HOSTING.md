# Self-hosted deployment

Requires Docker Compose, a domain pointing to the server, and ports 80/443 available. This stack runs Next.js with a non-root standalone server, Caddy for HTTPS, and Redis for persistent abuse protection.

## Configure and deploy

In `web/`, copy `.env.example` to `.env` and set `APP_DOMAIN`. Configure Gemini or another image provider below. Then:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web
```

Do not publish the Next.js or Redis port to the internet. Caddy overwrites `X-Real-IP` with the actual remote address. `TRUST_PROXY=true` is appropriate only behind this trusted proxy. If using Cloudflare or another proxy in front of Caddy, configure its trusted proxy ranges first; otherwise all visitors may share its IP limit. Native Node deployments must set `REDIS_URL`, `APP_ORIGIN`, and the correct trusted-proxy configuration themselves.

Keep the `redis_data` volume across upgrades. Removing it removes quota history. Redis uses AOF persistence and a no-eviction policy: limits fail closed with HTTP 503 if the store is unavailable. Back up the volume for server migrations.

## Image providers

Gemini remains the default in the application:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-flash-image
```

For an OpenAI-compatible Gemini router, use a base ending in `/v1` and set the router's exact image-capable model name.

OpenAI image editing:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-image-1
OPENAI_API_MODE=edits
```

For a custom ChatGPT-compatible router that returns images from chat completions:

```dotenv
OPENAI_BASE_URL=https://your-router.example/v1
OPENAI_MODEL=your-image-capable-model
OPENAI_API_MODE=chat
```

`edits` sends multipart requests to `/images/edits`. `chat` sends multimodal JSON to `/chat/completions`. Text-only ChatGPT models cannot edit and return images. Supported outputs are base64 PNG, JPEG, WebP, inline Gemini data, chat image data URLs, and remote image URLs on the provider origin or HTTPS origins explicitly listed in `PROVIDER_IMAGE_ORIGINS`. Redirects are rejected and result sizes are bounded. Provider keys, endpoints and model names are server settings, not visitor-controlled inputs. Base URLs require HTTPS.

Apply environment changes with `docker compose up -d --force-recreate web`. No rebuild is needed for API credentials or model changes.

## Quotas and rate limits

- Successful watermark edits: 5 per browser identity and public IP per day, reset at 00:00 WIB. Shared public IPs share this IP cap. Without accounts, this is not a verified human identity.
- Failed provider/image operations release the reserved quota. Concurrent requests reserve atomically before processing, preventing a quota race.
- One active edit per public IP, globally 2 active edits by default (`WATERMARK_CONCURRENCY`, maximum 16).
- Watermark attempts: 10/minute and 30/hour per IP, including failures.
- Image proxy: 180 requests/minute per IP.
- Cart: 10/minute. JSON API: 20/minute. Quota status: 30/minute.
- API request bodies: Caddy maximum 2 MB; watermark requests maximum 16 KB. Input photos maximum 20 MB, provider responses bounded. Large cart JSON is parsed in the browser.
- Edit requests time out after 150 seconds. Caddy waits up to 180 seconds for upstream response headers.

HTTP 429 includes `Retry-After`. Quota status is available at `/api/watermark-quota`. `/api/health` provides an application liveness check. Server crashes can conservatively keep a reserved quota until the daily reset; active processing leases expire after 180 seconds.

## Troubleshooting text-only router responses

If the server reports `Custom Proxy mengembalikan response text/chat biasa`, it is running the older parser. Rebuild the web container with `docker compose up -d --build web` and reload the app. The updated parser accepts `message.images`, multimodal `message.content`, base64 image results, Gemini inline parts, raw image bodies, and approved remote result URLs.

Confirm `GEMINI_MODEL` or `OPENAI_MODEL` matches the router's image-output model identifier. A model name that only provides text will still be rejected. Logs for missing inline images contain response field names and finish reasons, not the image, API key, or full provider text. Inspect with `docker compose logs --tail=100 web`.

Direct test requests should use `credentials: "same-origin"` so the browser identity cookie is preserved. The public-IP quota still applies when cookies are omitted.

## Verification

```sh
npm ci
npm run check
```

The abuse integration test starts an isolated `redis-server` on port 16389, so install Redis locally before running tests outside Docker. Real provider success must be checked with the configured credentials and an allowed Fotoyu photo.

The application no longer loads Vercel analytics or speed-insights. Bookmarklet URLs derive from the browser's current origin, so changing the hosting domain does not require a build-time public URL. Caddy preserves application cache headers and does not publicly cache private photo downloads.
