#!/usr/bin/env node
/**
 * Download every rendered Cloudinary image the storefront still depends on,
 * plus the blank garments and design artwork those mockups were built from.
 * Converts storefront renders to WebP, keeps the PNG, and uploads both to R2.
 *
 * Does not change Supabase. It writes:
 *   app/lib/cloudinary-image-manifest.json
 *   scripts/cloudinary-archive-report.json
 *   supabase/migrations/202611070001_r2_catalog_images.sql
 *
 * Usage:
 *   R2_INGEST_URL=https://<worker> R2_INGEST_TOKEN=... \
 *     node scripts/archive-cloudinary-images.mjs <cloudinary-url-dump.json>
 *
 * The dump is the Supabase export of distinct res.cloudinary.com URLs
 * (`[{ "url": "..." }, ...]` or the raw MCP result that contains that array).
 * Omit R2_INGEST_URL to download and write the manifest without uploading.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import catalog from '../app/lib/blc-colors.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicBase = (process.env.IMAGE_PUBLIC_BASE || 'https://images.bottomslineclothing.com').replace(/\/$/, '');
const ingestUrl = (process.env.R2_INGEST_URL || '').replace(/\/$/, '');
const ingestToken = process.env.R2_INGEST_TOKEN || '';
const dumpPath = process.argv[2];
const workDir = join(root, 'work', 'cloudinary-archive');
const cloud = catalog.cloud;
const uploadBase = `https://res.cloudinary.com/${cloud}/image/upload`;

const HARDCODED = [
  'https://res.cloudinary.com/bihiyho3/image/upload/v1790043735/ChatGPT_Image_Aug_27_2026_05_18_54_PM_3.png',
  'https://res.cloudinary.com/bihiyho3/image/upload/e_background_removal/v1787869598/ChatGPT_Image_Aug_27_2026_05_18_54_PM_1.png',
  'https://res.cloudinary.com/bihiyho3/image/upload/l_designs:spread-legs-mugtl36x,fl_relative,w_0.3859,g_north,x_-0.0007,y_0.2681/e_trim/blanks/tultex202/202_navy_front.png',
];

function trimMockup(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('/e_trim') || url.includes(',e_trim')) return url;
  return url.replace('/image/upload/', '/image/upload/e_trim/');
}

function hash12(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function loadDump(path) {
  if (!path) throw new Error('Pass the Cloudinary URL dump JSON as the first argument.');
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  const text = typeof parsed?.result === 'string' ? parsed.result : raw;
  const start = text.indexOf('[{');
  const end = text.lastIndexOf('}]');
  const rows = start >= 0 ? JSON.parse(text.slice(start, end + 2)) : parsed;
  if (!Array.isArray(rows)) throw new Error('URL dump did not contain an array.');
  return rows.map((row) => (typeof row === 'string' ? row : row.url)).filter(Boolean);
}

function blankPaths() {
  const paths = new Set();
  for (const [garment, colors] of Object.entries(catalog.colors)) {
    const spec = catalog.garments[garment];
    if (!spec) continue;
    for (const color of colors) paths.add(`blanks/${spec.folder}/${spec.prefix}_${color.token}_front.png`);
  }
  return paths;
}

function storefrontLeaf(delivered) {
  const design = delivered.match(/l_designs:([^,/]+)/);
  const blank = delivered.match(/\/blanks\/(.+)$/);
  if (design && blank) {
    const blankName = blank[1].replace(/\.png$/i, '').replace(/\//g, '__');
    return `${design[1]}/${blankName}`;
  }
  const base = decodeURIComponent(delivered.split('/').pop() || 'image').replace(/\.[a-z0-9]+$/i, '');
  return `misc/${base.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80)}`;
}

function isImage(bytes) {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'image/png,image/webp,image/jpeg', 'User-Agent': 'Mozilla/5.0 (compatible; BottomsLineImageArchive/1.0)' },
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status === 404) return { status: 404, bytes: null, contentType: '' };
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const contentType = (response.headers.get('content-type') || '').split(';')[0];
      if (!contentType.startsWith('image/') || !isImage(bytes)) {
        throw new Error(`Not an image (${contentType}, ${bytes.length} bytes)`);
      }
      return { status: response.status, bytes, contentType };
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt * attempt);
    }
  }
  throw lastError;
}

async function pool(items, limit, worker) {
  const queue = items.slice();
  async function run() {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

async function upload(key, bytes, contentType) {
  if (!ingestUrl) return;
  const endpoint = `${ingestUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${ingestToken}`,
          'content-type': contentType,
        },
        body: bytes,
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`Upload ${response.status}: ${(await response.text()).slice(0, 180)}`);
      return;
    } catch (error) {
      lastError = error;
      await sleep(400 * attempt * attempt);
    }
  }
  throw lastError;
}

async function main() {
  mkdirSync(workDir, { recursive: true });
  const databaseUrls = [...new Set(loadDump(dumpPath))];
  const databaseSet = new Set(databaseUrls);
  const storefrontSources = [...new Set([...databaseUrls, ...HARDCODED])];

  const blanks = blankPaths();
  const designSlugs = new Set();
  for (const url of storefrontSources) {
    const blank = url.match(/\/(blanks\/[^?#]+)/);
    if (blank) blanks.add(blank[1]);
    const design = url.match(/l_designs:([^,/]+)/);
    if (design) designSlugs.add(design[1]);
  }

  const storefrontJobs = storefrontSources.map((sourceUrl) => {
    const deliveredUrl = trimMockup(sourceUrl);
    const id = hash12(deliveredUrl);
    const leaf = storefrontLeaf(deliveredUrl);
    return {
      kind: 'storefront',
      sourceUrl,
      deliveredUrl,
      inDatabase: databaseSet.has(sourceUrl),
      id,
      webpKey: `catalog/${leaf}.${id}.webp`,
      pngKey: `originals/catalog/${leaf}.${id}.png`,
    };
  });

  const deliveredGroups = new Map();
  for (const job of storefrontJobs) {
    if (!deliveredGroups.has(job.deliveredUrl)) deliveredGroups.set(job.deliveredUrl, []);
    deliveredGroups.get(job.deliveredUrl).push(job);
  }

  const sourceJobs = [
    ...[...blanks].map((path) => ({ kind: 'blank', sourceUrl: `${uploadBase}/${path}`, key: `sources/${path}` })),
    ...[...designSlugs].map((slug) => ({ kind: 'design', sourceUrl: `${uploadBase}/designs/${slug}.png`, key: `sources/designs/${slug}.png` })),
  ];

  const statePath = join(workDir, 'state.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { files: {} };
  const saveState = () => writeFileSync(statePath, JSON.stringify(state));

  let done = 0;
  const groups = [...deliveredGroups.entries()];
  console.log(`Storefront renders: ${groups.length}. Source files: ${sourceJobs.length}.`);

  await pool(groups, 6, async ([deliveredUrl, jobs]) => {
    const id = jobs[0].id;
    const pngPath = join(workDir, 'png', `${id}.png`);
    mkdirSync(dirname(pngPath), { recursive: true });
    if (!state.files[id]?.pngBytes) {
      const downloaded = await fetchBytes(deliveredUrl);
      if (!downloaded.bytes) throw new Error(`Storefront image missing: ${deliveredUrl}`);
      writeFileSync(pngPath, downloaded.bytes);
      state.files[id] = { ...(state.files[id] || {}), pngBytes: downloaded.bytes.length, contentType: downloaded.contentType, deliveredUrl };
      saveState();
    }
    done += 1;
    if (done % 25 === 0 || done === groups.length) console.log(`downloaded ${done}/${groups.length}`);
  });

  console.log('Converting storefront renders to WebP…');
  let converted = 0;
  await pool(groups, 4, async ([, jobs]) => {
    const id = jobs[0].id;
    const pngPath = join(workDir, 'png', `${id}.png`);
    const webpPath = join(workDir, 'webp', `${id}.webp`);
    mkdirSync(dirname(webpPath), { recursive: true });
    if (!state.files[id]?.webpBytes) {
      const webp = await sharp(pngPath).webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
      writeFileSync(webpPath, webp);
      state.files[id].webpBytes = webp.length;
      saveState();
    }
    converted += 1;
    if (converted % 25 === 0 || converted === groups.length) console.log(`converted ${converted}/${groups.length}`);
  });

  if (ingestUrl) {
    if (!ingestToken) throw new Error('R2_INGEST_TOKEN is required when R2_INGEST_URL is set.');
    console.log('Uploading storefront PNG + WebP…');
    let uploaded = 0;
    await pool(groups, 4, async ([, jobs]) => {
      const id = jobs[0].id;
      const record = state.files[id];
      if (!record.uploaded) {
        await upload(jobs[0].pngKey, readFileSync(join(workDir, 'png', `${id}.png`)), record.contentType || 'image/png');
        await upload(jobs[0].webpKey, readFileSync(join(workDir, 'webp', `${id}.webp`)), 'image/webp');
        record.uploaded = true;
        saveState();
      }
      uploaded += 1;
      if (uploaded % 25 === 0 || uploaded === groups.length) console.log(`uploaded ${uploaded}/${groups.length}`);
    });
  }

  console.log('Archiving blanks and design artwork…');
  const sources = [];
  let sourceDone = 0;
  await pool(sourceJobs, 6, async (job) => {
    const id = hash12(job.sourceUrl);
    const cachePath = join(workDir, 'sources', id);
    let record = state.files[`source:${id}`];
    if (!record) {
      try {
        const downloaded = await fetchBytes(job.sourceUrl);
        if (!downloaded.bytes) {
          record = { missing: true, status: 404 };
        } else {
          mkdirSync(dirname(cachePath), { recursive: true });
          writeFileSync(cachePath, downloaded.bytes);
          record = { pngBytes: downloaded.bytes.length, contentType: downloaded.contentType || 'image/png', missing: false, uploaded: false };
          if (ingestUrl) {
            await upload(job.key, downloaded.bytes, record.contentType);
            record.uploaded = true;
          }
        }
      } catch (error) {
        record = { missing: true, error: error instanceof Error ? error.message : String(error) };
      }
      state.files[`source:${id}`] = record;
      saveState();
    } else if (ingestUrl && record.pngBytes && !record.uploaded) {
      await upload(job.key, readFileSync(cachePath), record.contentType || 'image/png');
      record.uploaded = true;
      saveState();
    }
    sources.push({
      kind: job.kind,
      sourceUrl: job.sourceUrl,
      key: record.missing ? null : job.key,
      publicUrl: record.missing ? null : `${publicBase}/${job.key}`,
      bytes: record.pngBytes || 0,
      missing: Boolean(record.missing),
      error: record.error || null,
    });
    sourceDone += 1;
    if (sourceDone % 25 === 0 || sourceDone === sourceJobs.length) console.log(`sources ${sourceDone}/${sourceJobs.length}`);
  });

  const rewrite = {};
  const renders = [];
  let pngBytes = 0;
  let webpBytes = 0;
  for (const [deliveredUrl, jobs] of groups) {
    const record = state.files[jobs[0].id];
    const webpUrl = `${publicBase}/${jobs[0].webpKey}`;
    const pngUrl = `${publicBase}/${jobs[0].pngKey}`;
    pngBytes += record.pngBytes;
    webpBytes += record.webpBytes;
    for (const job of jobs) rewrite[job.sourceUrl] = webpUrl;
    if (!rewrite[deliveredUrl]) rewrite[deliveredUrl] = webpUrl;
    renders.push({
      deliveredUrl,
      sourceUrls: jobs.map((job) => job.sourceUrl),
      inDatabase: jobs.some((job) => job.inDatabase),
      webpKey: jobs[0].webpKey,
      pngKey: jobs[0].pngKey,
      webpUrl,
      pngUrl,
      pngBytes: record.pngBytes,
      webpBytes: record.webpBytes,
    });
  }

  const databasePairs = [];
  const seenDatabase = new Set();
  for (const job of storefrontJobs) {
    if (!job.inDatabase || seenDatabase.has(job.sourceUrl)) continue;
    seenDatabase.add(job.sourceUrl);
    databasePairs.push({ oldUrl: job.sourceUrl, newUrl: rewrite[job.sourceUrl] });
  }
  databasePairs.sort((a, b) => a.oldUrl.localeCompare(b.oldUrl));

  const values = databasePairs.map((pair) => `  (${sqlLiteral(pair.oldUrl)}, ${sqlLiteral(pair.newUrl)})`).join(',\n');
  const migration = `-- Move catalog and colorway image URLs off Cloudinary cloud bihiyho3.
-- Generated ${new Date().toISOString()} by scripts/archive-cloudinary-images.mjs.
-- NOT APPLIED. Review, then run in the Supabase SQL editor before Tuesday Nov 10.
--
-- The previous URL is copied into catalog_image_cloudinary / mockup_url_cloudinary
-- the first time a row changes, so this can be reversed with
-- scripts/rollback-r2-catalog-images.sql. Nothing is deleted from Cloudinary.
-- Safe to re-run: rows already pointing at the new URL are left alone.
-- Holiday mockups hosted on bottomslineclothing.com are not in this map.

begin;

alter table public.products
  add column if not exists catalog_image_cloudinary text;

alter table public.product_colors
  add column if not exists mockup_url_cloudinary text;

comment on column public.products.catalog_image_cloudinary is
  'Cloudinary URL replaced during the R2 cutover. Copy it back to catalog_image to roll back.';

comment on column public.product_colors.mockup_url_cloudinary is
  'Cloudinary URL replaced during the R2 cutover. Copy it back to mockup_url to roll back.';

update public.products as p
set
  catalog_image_cloudinary = coalesce(p.catalog_image_cloudinary, p.catalog_image),
  catalog_image = m.new_url
from (values
${values}
) as m(old_url, new_url)
where p.catalog_image = m.old_url
  and p.catalog_image is distinct from m.new_url;

update public.product_colors as c
set
  mockup_url_cloudinary = coalesce(c.mockup_url_cloudinary, c.mockup_url),
  mockup_url = m.new_url
from (values
${values}
) as m(old_url, new_url)
where c.mockup_url = m.old_url
  and c.mockup_url is distinct from m.new_url;

commit;

-- After it runs, both of these must return 0:
-- select count(*) from public.products where catalog_image ilike '%res.cloudinary.com/bihiyho3%';
-- select count(*) from public.product_colors where mockup_url ilike '%res.cloudinary.com/bihiyho3%';
`;

  const manifest = {
    publicBase,
    bucket: 'bottomsline-catalog',
    generatedAt: new Date().toISOString(),
    rewrite,
  };
  const presentSources = sources.filter((source) => !source.missing);
  const missingSources = sources.filter((source) => source.missing);
  const report = {
    publicBase,
    bucket: 'bottomsline-catalog',
    generatedAt: manifest.generatedAt,
    storefrontRenders: renders.length,
    storefrontSourceUrls: storefrontJobs.length,
    databaseUrls: databasePairs.length,
    pngBytes,
    webpBytes,
    sourceFiles: presentSources.length,
    sourceBytes: presentSources.reduce((sum, source) => sum + source.bytes, 0),
    missingSources: missingSources.length,
    renders,
    sources: sources.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl)),
  };

  writeFileSync(join(root, 'app/lib/cloudinary-image-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(root, 'scripts/cloudinary-archive-report.json'), `${JSON.stringify(report)}\n`);
  writeFileSync(join(root, 'supabase/migrations/202611070001_r2_catalog_images.sql'), migration);

  if (ingestUrl) {
    console.log('Checking a sample of public URLs…');
    const sample = renders.filter((_, index) => index % Math.ceil(renders.length / 8) === 0).slice(0, 8);
    for (const render of sample) {
      const response = await fetch(render.webpUrl, { method: 'HEAD' });
      if (!response.ok) throw new Error(`Public WebP not reachable (${response.status}): ${render.webpUrl}`);
      const png = await fetch(render.pngUrl, { method: 'HEAD' });
      if (!png.ok) throw new Error(`Public PNG not reachable (${png.status}): ${render.pngUrl}`);
    }
  }

  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);
  console.log(JSON.stringify({
    storefrontRenders: renders.length,
    databaseUrls: databasePairs.length,
    pngMB: mb(pngBytes),
    webpMB: mb(webpBytes),
    sourceFiles: presentSources.length,
    sourceMB: mb(report.sourceBytes),
    missingSources: missingSources.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
