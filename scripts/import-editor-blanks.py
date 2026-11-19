"""Import front-only garment blanks to R2 for the private design editor.

Usage: python3 scripts/import-editor-blanks.py MODEL SOURCE [--dry-run]
SOURCE may be a directory or ZIP file. Requires authenticated Wrangler in PATH.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import re
import subprocess
import tempfile
import time
import zipfile

BUCKET = "bottomsline-catalog"
PREFIX = "editor/blanks"
EXPAND_340 = {
    "heathercharcoal": "heather_charcoal", "heatherdenim": "heather_denim",
    "heathergraphite": "heather_graphite", "heathergrey": "heather_grey",
    "heatherred": "heather_red", "lightpink": "light_pink",
    "militarygreen": "military_green", "neomint": "neo_mint",
    "puristblue": "purist_blue",
}


def files(source, model):
    if source.is_dir():
        for item in sorted(source.rglob("*.png")):
            if item.name.lower().endswith("_front.jpg" if model == "6606" else "_front.png"):
                yield item.name, item.read_bytes()
    else:
        with zipfile.ZipFile(source) as archive:
            for item in sorted(archive.namelist()):
                if item.lower().endswith("_front.jpg" if model == "6606" else "_front.png"):
                    yield Path(item).name, archive.read(item)


def color_token(filename, model):
    stem = Path(filename).stem.lower()
    stem = re.sub(r"^tultex_", "", stem)
    if model == "6606":
        stem = re.sub(r"^yupoong-6606_", "", stem)
        match = re.fullmatch(r"(.+)_front", stem)
    else:
        match = re.fullmatch(rf"{re.escape(model)}_(.+)_front", stem)
    if not match:
        raise ValueError(f"Unexpected filename for {model}: {filename}")
    token = match.group(1)
    return EXPAND_340.get(token, token) if model == "340" else token


def put(item):
    token, data, model = item
    if model == "6606":
        if data[:3] != b"\xff\xd8\xff":
            raise ValueError(f"Not a JPEG: {token}")
        key = f"{PREFIX}/yupoong6606/yupoong-6606_{token}_front.jpg"
        extension, content_type = ".jpg", "image/jpeg"
    else:
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"Not a PNG: {token}")
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        if (width, height) != (2000, 3000):
            raise ValueError(f"Unexpected dimensions for {model}/{token}: {width}x{height}")
        key = f"{PREFIX}/tultex{model}/{model}_{token}_front.png"
        extension, content_type = ".png", "image/png"
    with tempfile.NamedTemporaryFile(suffix=extension) as temp:
        temp.write(data)
        temp.flush()
        command = ["pnpm", "exec", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}", "--file", temp.name, "--content-type", content_type, "--remote", "--force"]
        for attempt in range(3):
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode == 0:
                break
            if attempt < 2 and ("503" in result.stderr or "Service Unavailable" in result.stderr):
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{key}: {result.stderr[-500:]}")
    return key, len(data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("model", choices=["202", "320", "340", "6606"])
    parser.add_argument("source", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    items = [(color_token(name, args.model), data, args.model) for name, data in files(args.source, args.model)]
    tokens = [item[0] for item in items]
    if len(tokens) != len(set(tokens)):
        raise ValueError("Duplicate color tokens in source")
    print(f"{args.model}: {len(items)} front blanks, {sum(len(data) for _, data, _ in items):,} bytes", flush=True)
    if args.dry_run:
        print(" ".join(tokens))
        return
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(put, item): item[0] for item in items}
        for index, future in enumerate(as_completed(futures), 1):
            key, size = future.result()
            print(f"{index}/{len(items)} {key} {size}", flush=True)


if __name__ == "__main__":
    main()
