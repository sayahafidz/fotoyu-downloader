#!/usr/bin/env python3
"""
Fotoyu Downloader (CLI & Termux Android)
---------------------------------------
Parse a fotoyu API JSON response file OR fetch cart data directly using a Bearer token / persist:root,
extract every image "url" field from result.data[], and download all images concurrently
into a `media/` folder (or Android Downloads folder) with retries, resume support, and progress bar.
"""

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

import aiohttp
from tqdm import tqdm


DEFAULT_INPUT = "response-fotoyu.txt"
DEFAULT_OUTPUT = "media"
DEFAULT_CONCURRENCY = 10
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.5  # seconds
FOTOYU_CART_API = "https://api.fotoyu.com/gs/v1/carts/preview"

# Browser-like headers to avoid being blocked by the image proxy and API.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Referer": "https://fotoyu.com/",
    "Origin": "https://fotoyu.com",
}


def sanitize_filename(name: str) -> str:
    """Remove characters that are unsafe on Windows and Unix."""
    if not name:
        return ""
    name = name.replace("/", "_").replace("\\", "_")
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = name.strip().rstrip(". ")
    return name


def extract_filename(title: str, product_id: str, url: str, used_names: set) -> str:
    """Build a unique, safe filename for a download item."""
    base = sanitize_filename(title) or sanitize_filename(product_id) or "image"

    if "." not in base:
        ext = ".jpg"
        url_path = url.split("?", 1)[0]
        last_seg = url_path.rsplit("/", 1)[-1]
        m = re.search(r"\.([a-zA-Z]{3,4})(?:$|\?|#)", last_seg)
        if m:
            ext = "." + m.group(1).lower()
        base = base + ext

    if base in used_names:
        stem, dot, ext = base.rpartition(".")
        if not dot:
            stem, ext = base, ""
        else:
            ext = "." + ext
        i = 2
        candidate = f"{stem}_{i}{ext}"
        while candidate in used_names:
            i += 1
            candidate = f"{stem}_{i}{ext}"
        base = candidate

    used_names.add(base)
    return base


def extract_token(raw_input: str) -> str:
    """Extract Bearer token directly or from persist:root JSON."""
    raw = raw_input.strip()
    if re.match(r"^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$", raw):
        return raw

    m = re.search(r'\\?"access_token\\?"\s*:\s*\\?"(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\\?"', raw)
    if m:
        return m.group(1)

    try:
        data = json.loads(raw)
        if isinstance(data, str):
            data = json.loads(data)
        if isinstance(data, dict):
            user_val = data.get("user")
            if isinstance(user_val, str):
                user = json.loads(user_val)
                token = user.get("access_token")
                if token and isinstance(token, str):
                    return token
    except Exception:
        pass

    return raw


async def fetch_cart_items_via_token(token: str) -> list[dict]:
    """Fetch cart items directly from Fotoyu API using access token."""
    clean_token = extract_token(token)
    headers = {
        **HEADERS,
        "Authorization": f"Bearer {clean_token}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
    }
    payload = {"page": 1, "limit": 100, "selected_products": []}

    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(FOTOYU_CART_API, json=payload, headers=headers) as resp:
            if resp.status == 401 or resp.status == 403:
                raise RuntimeError("Token tidak valid atau sudah expired. Silakan ambil token baru.")
            if resp.status != 200:
                raise RuntimeError(f"API fotoyu mengembalikan HTTP {resp.status}")
            data = await resp.json()
            result = data.get("result", {}) if isinstance(data, dict) else {}
            items = result.get("data", []) if isinstance(result, dict) else []
            return items if isinstance(items, list) else []


def load_items(input_path: Path) -> list[dict]:
    """Load JSON response from local file and return the list of data items."""
    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    result = data.get("result", {}) if isinstance(data, dict) else {}
    items = result.get("data", []) if isinstance(result, dict) else []
    if not isinstance(items, list):
        items = []
    return items


def build_download_list(items: list[dict]) -> list[tuple[str, str]]:
    """Return list of (url, filename) tuples for items that have a usable url."""
    used_names: set[str] = set()
    downloads: list[tuple[str, str]] = []
    seen_urls: set[str] = set()

    for item in items:
        if not isinstance(item, dict):
            continue
        content_type = item.get("content_type")
        if content_type and content_type != "photo":
            continue

        url = item.get("url")
        if not url or not isinstance(url, str):
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)

        title = item.get("title", "") or ""
        product_id = item.get("product_id", "") or ""
        filename = extract_filename(title, product_id, url, used_names)
        downloads.append((url, filename))

    return downloads


async def download_one(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    url: str,
    dest: Path,
    pbar: tqdm,
    stats: dict,
) -> None:
    """Download a single file with retries, resume support, and atomicity."""
    if dest.exists() and dest.stat().st_size > 0:
        stats["skipped"] += 1
        pbar.update(1)
        return

    async with sem:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with session.get(url, headers=HEADERS) as resp:
                    if resp.status != 200:
                        raise RuntimeError(f"HTTP {resp.status}")

                    tmp = dest.with_suffix(dest.suffix + ".part")
                    total = 0
                    with tmp.open("wb") as fh:
                        async for chunk in resp.content.iter_chunked(64 * 1024):
                            fh.write(chunk)
                            total += len(chunk)
                    tmp.replace(dest)

                    stats["success"] += 1
                    stats["bytes"] += total
                    pbar.update(1)
                    return
            except (aiohttp.ClientError, RuntimeError, asyncio.TimeoutError) as e:
                tmp = dest.with_suffix(dest.suffix + ".part")
                try:
                    if tmp.exists():
                        tmp.unlink()
                except OSError:
                    pass

                if attempt == MAX_RETRIES:
                    stats["failed"] += 1
                    stats["failed_files"].append(dest.name)
                    pbar.update(1)
                    print(f"\n[FAIL] {dest.name}: {e}", file=sys.stderr)
                    return
                await asyncio.sleep(RETRY_BACKOFF_BASE ** attempt)


async def run_downloads(
    downloads: list[tuple[str, str]],
    output_dir: Path,
    concurrency: int,
) -> dict:
    """Run all downloads concurrently with a semaphore limit."""
    stats = {
        "success": 0,
        "failed": 0,
        "skipped": 0,
        "bytes": 0,
        "failed_files": [],
    }

    connector = aiohttp.TCPConnector(limit=concurrency, force_close=False)
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=120)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        sem = asyncio.Semaphore(concurrency)
        with tqdm(total=len(downloads), unit="file", desc="Mengunduh foto") as pbar:
            tasks = [
                download_one(
                    session,
                    sem,
                    url,
                    output_dir / filename,
                    pbar,
                    stats,
                )
                for url, filename in downloads
            ]
            await asyncio.gather(*tasks)

    return stats


def format_bytes(n: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    f = float(n)
    for u in units:
        if f < 1024.0:
            return f"{f:.2f} {u}"
        f /= 1024.0
    return f"{f:.2f} TB"


def get_default_output() -> str:
    """Auto-detect Termux storage path on Android if available, else ./media"""
    termux_storage = Path.home() / "storage" / "downloads" / "Fotoyu"
    if termux_storage.parent.exists():
        return str(termux_storage)
    return DEFAULT_OUTPUT


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Fotoyu Concurrent Downloader - Download semua foto dari keranjang fotoyu.com (PC & Termux Android).",
    )
    p.add_argument(
        "--token", "-t",
        default=os.environ.get("FOTOYU_TOKEN", ""),
        help="Bearer token atau persist:root fotoyu untuk mengambil cart langsung via API",
    )
    p.add_argument(
        "--input", "-i",
        default=DEFAULT_INPUT,
        help=f"File path JSON response fotoyu (default: {DEFAULT_INPUT})",
    )
    p.add_argument(
        "--output", "-o",
        default=get_default_output(),
        help=f"Folder tujuan download foto (default: {get_default_output()})",
    )
    p.add_argument(
        "--concurrency", "-c",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help=f"Jumlah download paralel bersamaan (default: {DEFAULT_CONCURRENCY})",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    items: list[dict] = []

    # Priority 1: Direct Token Fetch
    if args.token:
        print(f"Mengambil data keranjang via API fotoyu...")
        try:
            items = asyncio.run(fetch_cart_items_via_token(args.token))
        except Exception as e:
            print(f"Error mengambil cart via token: {e}", file=sys.stderr)
            return 1
    # Priority 2: JSON file input
    else:
        input_path = Path(args.input).resolve()
        if not input_path.exists():
            print(f"Error: input file tidak ditemukan: {input_path}", file=sys.stderr)
            print("Gunakan --token \"<TOKEN_FOTOYU>\" untuk download langsung tanpa file JSON.", file=sys.stderr)
            return 1
        print(f"Input:       {input_path}")
        try:
            items = load_items(input_path)
        except json.JSONDecodeError as e:
            print(f"Error: gagal membaca JSON: {e}", file=sys.stderr)
            return 1

    print(f"Output dir:  {output_dir}")
    print(f"Concurrency: {args.concurrency}")

    downloads = build_download_list(items)
    print(f"Ditemukan {len(items)} item, {len(downloads)} foto siap diunduh.\n")

    if not downloads:
        print("Tidak ada foto yang dapat diunduh (keranjang kosong).")
        return 0

    stats = asyncio.run(run_downloads(downloads, output_dir, args.concurrency))

    print("\n" + "=" * 50)
    print("Ringkasan Pengunduhan")
    print("=" * 50)
    print(f"  Total foto:   {len(downloads)}")
    print(f"  Berhasil:     {stats['success']}")
    print(f"  Dilewati:     {stats['skipped']} (sudah ada)")
    print(f"  Gagal:        {stats['failed']}")
    print(f"  Total data:   {format_bytes(stats['bytes'])}")
    if stats["failed_files"]:
        print("\nFile yang gagal:")
        for name in stats["failed_files"]:
            print(f"  - {name}")

    return 0 if stats["failed"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
