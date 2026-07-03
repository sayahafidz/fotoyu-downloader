# Server Setup Guide — Fotoyu Downloader (Docker)

> Hand-off document for an autonomous deployment agent (e.g. Hermes).
> Follow this guide to deploy the `web/` Next.js app on a fresh VPS with Docker,
> Caddy reverse proxy, and automatic HTTPS.

## 1. Target VPS Requirements

- **OS**: Ubuntu 22.04 LTS or 24.04 LTS (recommended)
- **Resources**: minimum 1 vCPU / 1 GB RAM / 10 GB storage
- **Network**:
  - Public IPv4 address
  - Domain (or subdomain) with A/AAAA records pointing to the VPS IP
  - Ports `22` (SSH), `80` (HTTP), `443` (HTTPS) open in the cloud firewall / UFW
- **Tools**: `git`, `docker`, `docker compose` v2

## 2. Install Docker & Docker Compose (if missing)

```bash
# Update package index
apt-get update

# Install prerequisites
apt-get install -y ca-certificates curl gnupg lsb-release git

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repo
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
docker compose version
```

## 3. Clone Repository

```bash
cd /opt
git clone https://github.com/sayahafidz/fotoyu-downloader.git
cd fotoyu-downloader/web
```

## 4. Configure Environment

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set the public domain where this app will be served:

```bash
nano .env
```

Example content:

```dotenv
NEXT_PUBLIC_APP_URL=https://fotoyu.example.com
APP_DOMAIN=fotoyu.example.com
```

> Both values should match your actual domain.

## 5. Configure Caddy

Edit `Caddyfile` and replace `{$APP_DOMAIN}` placeholder usage if needed, but
prefer editing via the `.env` `APP_DOMAIN` value. The provided Caddyfile already
uses `{$APP_DOMAIN}` so it reads from the environment variable.

If you need to hard-code, edit:

```bash
nano Caddyfile
```

Change `{$APP_DOMAIN}` to `fotoyu.example.com` (your actual domain).

## 6. Build & Start Services

```bash
docker compose up -d --build
```

This command:
- Builds the Next.js production image
- Starts the `web` container on port `3000` (internal only)
- Starts the `caddy` container on ports `80` and `443`
- Auto-provisions a Let's Encrypt TLS certificate for your domain

## 7. Verify Deployment

Wait 30–60 seconds, then run:

```bash
# Check containers are running
docker compose ps

# Check logs
docker compose logs -f web
```

Open the domain in a browser:

```
https://fotoyu.example.com
```

You should see the Fotoyu Downloader web app with three tabs:
- **Login dengan token**
- **Paste JSON**
- **Prompt AI**

## 8. Test Full Workflow

1. Open **fotoyu.com** in another tab and login.
2. Use the bookmarklet (drag to bookmark bar, click) or copy `persist:root`
   from Local Storage manually.
3. Fetch cart → preview grid should appear.
4. Click **Download** on a single photo → should download successfully.
5. Click **Download semua (ZIP)** → should generate and download a ZIP file.

> If the proxy route returns 403, the VPS IP is likely from a blocked ASN. In
> that case, try a different VPS provider or region (Indonesian ISPs usually work).

## 9. Update / Redeploy

When a new version of the app is pushed to the repo:

```bash
cd /opt/fotoyu-downloader/web
git pull
docker compose up -d --build
```

Optional cleanup of old images:

```bash
docker image prune -f
```

## 10. Troubleshooting

### Caddy fails to get a certificate

- Make sure the domain DNS records fully propagate (`dig +short fotoyu.example.com` returns your VPS IP).
- Make sure ports 80 and 443 are open to the internet.
- Check logs: `docker compose logs caddy`

### 502 Bad Gateway on `/api/proxy`

- The upstream CDN (`cfsimgproxy.fototree.com`) may be blocking the VPS IP. Check the web container logs:
  `docker compose logs web | grep -i upstream`
- Try a different server location or ISP.

### Container `web` fails healthcheck

- Check the build log: `docker compose logs web --tail 100`
- Ensure the `NEXT_PUBLIC_APP_URL` env var is set in `.env`.

## 11. Files Involved in This Deployment

- `web/Dockerfile` — multi-stage Next.js standalone image
- `web/docker-compose.yml` — orchestrates Next.js + Caddy
- `web/Caddyfile` — reverse proxy + HTTPS config
- `web/.env` — environment variables (created locally, not committed)
- `web/.env.example` — template for `.env`

## 12. Security Notes

- The `.env` file should not be committed to Git.
- Docker containers run the Next.js app as a non-root (`nextjs`) user.
- Only Caddy is exposed to the public internet; the Next.js container is internal.
- The bookmarklet passes sensitive data via URL fragment (`#t=...`), which is
  never sent to the server over the wire.
