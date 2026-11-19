"""Restore selected original PNG artwork to R2 without Cloudinary storage.

Usage: python3 scripts/import-editor-artwork.py SLUG=PATH [SLUG=PATH ...]
Only pass source artwork, not finished garment mockups. Requires Wrangler login.
"""
import hashlib
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

BUCKET = "bottomsline-catalog"


def upload(spec):
    slug, separator, path = spec.partition("=")
    if not separator or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError(f"Expected slug=path: {spec}")
    source = Path(path)
    data = source.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG: {source}")
    digest = hashlib.sha256(data).hexdigest()[:12]
    key = f"editor/artwork/{slug}.{digest}.png"
    with tempfile.NamedTemporaryFile(suffix=".png") as temp:
        temp.write(data)
        temp.flush()
        command = ["pnpm", "exec", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}", "--file", temp.name, "--content-type", "image/png", "--remote", "--force"]
        for attempt in range(3):
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode == 0:
                break
            if attempt < 2 and ("503" in result.stderr or "Service Unavailable" in result.stderr):
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{key}: {result.stderr[-500:]}")
    print(f"https://images.bottomslineclothing.com/{key}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for item in sys.argv[1:]:
        upload(item)
