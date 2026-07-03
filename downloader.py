#!/usr/bin/env python3
"""
Fotoyu Downloader
-----------------
Parse a fotoyu API JSON response file, extract every image "url" field
from result.data[], and download all images concurrently into a `media/`
folder with retries, resume support, and a progress bar.
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

# Browser-like headers to avoid being blocked by the image proxy.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://fotoyu.com/",
}


def sanitize_filename(name: str) -> str:
    """Remove characters that are unsafe on Windows."""
    if not name:
        return ""
    # Strip path separators and other forbidden Windows chars.
    name = name.replace("/", "_").replace("\\", "_")
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = name.strip().rstrip(". ")
    return name


def extract_filename(title: str, product_id: str, url: str, used_names: set) -> str:
    """Build a unique, safe filename for a download item."""
    base = sanitize_filename(title) or sanitize_filename(product_id) or "image"

    # Ensure it has an extension. Infer from URL path if missing.
    if "." not in base:
        ext = ".jpg"
        url_path = url.split("?", 1)[0]
        last_seg = url_path.rsplit("/", 1)[-1]
        m = re.search(r"\.([a-zA-Z]{3,4})(?:$|\?|#)", last_seg)
        if m:
            ext = "." + m.group(1).lower()
        base = base + ext

    # Deduplicate: append _2, _3, ... if the name was already used.
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


def load_items(input_path: Path) -> list[dict]:
    """Load JSON response and return the list of data items."""
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
        # Only download photo content (skip videos / other types if present).
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
    """Download a single file with retries and resume support."""
    # Resume support: skip if the file already exists and is non-empty.
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

                    # Stream to a temp file then atomically rename, so a
                    # partial download never overwrites a good file.
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
                # Clean up partial file before retry.
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
                # Exponential backoff between retries.
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
        with tqdm(total=len(downloads), unit="file", desc="Downloading") as pbar:
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


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Download all photo URLs from a fotoyu API response JSON file.",
    )
    p.add_argument(
        "--input", "-i",
        default=DEFAULT_INPUT,
        help=f"Path to the fotoyu response file (default: {DEFAULT_INPUT})",
    )
    p.add_argument(
        "--output", "-o",
        default=DEFAULT_OUTPUT,
        help=f"Output folder (default: {DEFAULT_OUTPUT})",
    )
    p.add_argument(
        "--concurrency", "-c",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help=f"Number of parallel downloads (default: {DEFAULT_CONCURRENCY})",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        return 1

    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Input:       {input_path}")
    print(f"Output dir:  {output_dir}")
    print(f"Concurrency: {args.concurrency}")

    try:
        items = load_items(input_path)
    except json.JSONDecodeError as e:
        print(f"Error: failed to parse JSON: {e}", file=sys.stderr)
        return 1

    downloads = build_download_list(items)
    print(f"Found {len(items)} items, {len(downloads)} downloadable images.\n")

    if not downloads:
        print("Nothing to download.")
        return 0

    stats = asyncio.run(run_downloads(downloads, output_dir, args.concurrency))

    print("\n" + "=" * 50)
    print("Download summary")
    print("=" * 50)
    print(f"  Total:     {len(downloads)}")
    print(f"  Success:   {stats['success']}")
    print(f"  Skipped:   {stats['skipped']} (already existed)")
    print(f"  Failed:    {stats['failed']}")
    print(f"  Downloaded:{format_bytes(stats['bytes'])}")
    if stats["failed_files"]:
        print("\nFailed files:")
        for name in stats["failed_files"]:
            print(f"  - {name}")

    return 0 if stats["failed"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
