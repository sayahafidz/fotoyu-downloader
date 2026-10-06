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

## Admin and redeem credits

Set `ADMIN_PASSWORD` to a unique password of at least 16 characters in the server environment, then recreate the web container. Open `/admin` to log in. Sessions use an HttpOnly cookie and expire after 8 hours; login attempts are limited to 5 per 15 minutes per IP.

The admin can generate redeem codes with credits per redemption, a maximum redemption count, and an expiry of 1–365 days. Codes can be copied or disabled. Each browser identity may redeem a given code once, and code usage and balances are updated atomically in Redis.

Users redeem codes in the watermark options. Free daily quota is used first, then extra credits. Failed image operations refund whichever quota/credit was reserved. Rate limits and concurrency caps apply to both free and extra-credit edits.

Extra credits are tied to the visitor cookie, not a verified user account. Clearing cookies loses access to that balance. Multi-use codes can be redeemed again by another browser identity; use single-redemption codes for individual grants. Redis data contains balances and codes and must be backed up. This feature does not process payments.

For local `npm run dev`, Redis defaults to `redis://127.0.0.1:6379` when `REDIS_URL` is absent. Run a local Redis service or set `REDIS_URL` to your development instance. Production requires an explicit `REDIS_URL`; Compose provides it automatically. A quota HTTP 503 indicates unavailable or unconfigured Redis, rather than exhausted quota (HTTP 429).

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
