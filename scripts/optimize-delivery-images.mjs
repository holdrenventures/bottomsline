#!/usr/bin/env node
/**
 * Build WebP delivery copies for heavy storefront PNGs.
 *
 * Holiday mockups already live in this repo. Editor mockups live on
 * images.bottomslineclothing.com; this downloads public copies and writes
 * resized WebP files under public/opt. It does not upload, overwrite, or
 * delete anything in R2.
 *
 * Usage: node scripts/optimize-delivery-images.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/opt');
const manifestPath = join(root, 'app/lib/delivery-image-manifest.json');
const shopUrl = process.env.SHOP_URL || 'https://bottomslineclothing.com/shop';
const maxWidth = 1100;

mkdirSync(outDir, { recursive: true });

function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (entry.toLowerCase().endsWith('.png')) found.push(path);
  }
  return found;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BottomsLineImageOptimize/1.0)', Accept: 'text/html' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function imageUrls(html) {
  return [...html.matchAll(/https:\/\/images\.bottomslineclothing\.com\/[^"'\\\s>]+\.png/g)].map((match) => match[0]);
}

async function pool(items, size, worker) {
  const queue = [...items];
  const results = [];
  async function run() {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return results;
}

async function toWebp(bytes) {
  const resized = sharp(bytes, { failOn: 'none' }).rotate().resize({ width: maxWidth, withoutEnlargement: true });
  const output = await resized.webp({ quality: 72, effort: 4 }).toBuffer();
  const meta = await sharp(output).metadata();
  return { output, width: meta.width ?? maxWidth, height: meta.height ?? maxWidth };
}

const manifest = {};

function addRecord(keys, src, width, height) {
  const record = { src, width, height };
  for (const key of keys) manifest[key] = record;
}

async function convertBuffer(keys, bytes) {
  const src = `/opt/${hash(keys[0])}.webp`;
  const { output, width, height } = await toWebp(bytes);
  writeFileSync(join(root, 'public', src), output);
  addRecord(keys, src, width, height);
  return { src, before: bytes.length, after: output.length };
}

const holidayFiles = walk(join(root, 'public/holiday-mockups'));
let holidayBefore = 0;
let holidayAfter = 0;
for (const file of holidayFiles) {
  const rel = `/${relative(join(root, 'public'), file).split('\\').join('/')}`;
  const bytes = readFileSync(file);
  const saved = await convertBuffer([rel, `https://bottomslineclothing.com${rel}`], bytes);
  holidayBefore += saved.before;
  holidayAfter += saved.after;
}

let html = '';
try {
  html = await fetchText(shopUrl);
} catch (error) {
  console.warn('Could not read the live shop. Editor PNGs were not copied.', error);
}

const remote = new Set(imageUrls(html));
const productLinks = [...html.matchAll(/\/products\/[a-z0-9-]+/g)].map((match) => match[0]);
const uniqueProducts = [...new Set(productLinks)].slice(0, 80);
if (uniqueProducts.length && html) {
  const pages = await pool(uniqueProducts, 6, async (path) => {
    try {
      return await fetchText(`https://bottomslineclothing.com${path}`);
    } catch {
      return '';
    }
  });
  for (const page of pages) for (const url of imageUrls(page)) remote.add(url);
}

let remoteBefore = 0;
let remoteAfter = 0;
let remoteFailed = 0;
await pool([...remote], 6, async (url) => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BottomsLineImageOptimize/1.0)', Accept: 'image/png,image/webp,*/*' },
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const saved = await convertBuffer([url], bytes);
    remoteBefore += saved.before;
    remoteAfter += saved.after;
  } catch (error) {
    remoteFailed += 1;
    console.warn('skip', url, error instanceof Error ? error.message : error);
  }
});

const iconSvg = readFileSync(join(root, 'public/favicon.svg'));
await sharp(iconSvg).resize(64, 64).png().toFile(join(root, 'public/favicon.png'));
await sharp(iconSvg).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'));

const webpUrls = new Set();
if (html) {
  for (const match of html.matchAll(/https:\/\/images\.bottomslineclothing\.com\/[^"'\\\s>]+\.webp(?:\?[^"'\\\s>]*)?/g)) webpUrls.add(match[0]);
}
let measured = 0;
await pool([...webpUrls], 8, async (url) => {
  if (manifest[url]) return;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BottomsLineImageOptimize/1.0)', Accept: 'image/webp,*/*' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return;
    const bytes = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height) return;
    manifest[url] = { src: url, width: meta.width, height: meta.height };
    measured += 1;
  } catch (error) {
    console.warn('measure skip', url, error instanceof Error ? error.message : error);
  }
});

writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), maxWidth, images: manifest }, null, 2)}\n`);
console.log(JSON.stringify({
  holidayFiles: holidayFiles.length,
  holidayBefore,
  holidayAfter,
  remote: remote.size,
  remoteFailed,
  remoteBefore,
  remoteAfter,
  manifestKeys: Object.keys(manifest).length,
  measuredWebp: measured,
}, null, 2));
