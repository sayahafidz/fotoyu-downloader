# Security hardening

## Implemented and verified

- Updated Next.js to 16.3.8, React and CSS tooling. Production dependency audit reports zero advisories at the time of this change.
- Admin sessions store a password fingerprint, invalidating old sessions when ADMIN_PASSWORD changes. Tokens remain random, HttpOnly, expiring and hashed in Redis.
- JSON request readers enforce content type, object shape and byte limits even without a Content-Length header. Admin/redeem bodies are limited to 2 KB, watermark 16 KB, cart 128 KB, parse 2 MB.
- Mutating endpoints require the configured APP_ORIGIN. Missing Origin is rejected; caller-controlled Host no longer establishes a production trusted origin.
- Image input allowlist now requires HTTPS and exact approved hostnames. Generic GCS access and wildcard subdomains were removed. Unknown photo hosts must be reviewed before adding them.
- Proxy blocks SVG/non-image content and caps streamed images at 30 MB. Watermark input/output sizes remain bounded.
- Cart upstream response is capped at 8 MB; caller-provided Cookie forwarding was removed.
- Credit/quota finalization has a Redis idempotency marker so concurrent/repeated finish operations cannot refund more than once.
- Added CSP, frame denial, permissions policy and HSTS on HTTPS through Caddy. Disabled unused Next image optimization. Admin page requests no indexing.

## Important residual work

1. Full npm audit still reports seven development/build advisories in Tailwind 3's dependency chain. The advertised upgrade path is Tailwind 4, requiring a CSS/build configuration migration. Production-only npm audit is clean; do not treat that as a clean full audit.
2. CSP currently permits inline scripts/styles for Next bootstrap and theme initialization. It blocks framing and active objects, but is not a nonce-based strict CSP. A future nonce implementation requires coordinating Next rendering and theme scripts.
3. Visitor identities are anonymous cookies. Extra credits cannot be recovered across devices without accounts; multi-use codes can be redeemed through another browser identity. Use single-use codes for individual grants.
4. A process crash after reserving a credit can leave it consumed. Durable reservation recovery and a credit ledger are still needed before selling credits.
5. IP limits do not guarantee human identity and cannot prevent distributed abuse. Configure the trusted reverse proxy correctly, keep the app/Redis ports private, and use upstream traffic limits if needed.
6. Exact host allowlists do not validate DNS resolution against private networks. Trusted CDN hostname compromise/DNS redirection remains a residual SSRF risk. Outbound network policy/DNS pinning would add protection.
7. Admin password was shared in chat. Rotate it before production use, set APP_ORIGIN to the public HTTPS origin, and back up Redis data. Never commit environment secrets.

## Deployment

Set APP_DOMAIN and ADMIN_PASSWORD in the server environment. Docker Compose sets APP_ORIGIN from APP_DOMAIN and TRUST_PROXY=true only behind Caddy, which overwrites X-Real-IP. For native hosting configure APP_ORIGIN explicitly and ensure only your trusted proxy reaches the application.

Rebuild with `docker compose up -d --build`. Existing admin sessions will require login again after this release. Requests from API clients must include the configured Origin and JSON Content-Type. Do not expose Redis port 6379 or Next port 3000 publicly.

## Verification scope

Automated regression tests cover JSON bounds, trusted origins, host allowlists, password rotation, quota concurrency, code redemption, and credit refund. Typecheck, tests and production build pass. This is code hardening with local tests, not an exhaustive live penetration test or assurance that no vulnerabilities remain.
