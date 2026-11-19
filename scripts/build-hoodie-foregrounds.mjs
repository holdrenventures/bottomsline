// Rasterize source-photo pixels through reviewed vector paths. No generated fabric.
// Usage: node scripts/build-hoodie-foregrounds.mjs SOURCE_DIRECTORY OUTPUT_DIRECTORY
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error('Provide source and output directories.');
const paths = JSON.parse(await fs.readFile(new URL('./hoodie-masks/paths.json', import.meta.url), 'utf8'));
await fs.mkdir(output, { recursive: true });
const manifest = {};
for (const [token, strokes] of Object.entries(paths)) {
 const folder = token.split('_').map(v => v[0].toUpperCase()+v.slice(1)).join(' ');
 const file = path.join(source, folder, `Tultex_320_${folder.replaceAll(' ', '_')}_Front.png`);
 const svg = `<svg width="2000" height="3000"><g transform="translate(780 650) scale(2)" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">${strokes.map(([d,w])=>`<path d="${d}" stroke-width="${w}"/>`).join('')}</g></svg>`;
 const bytes = await sharp(file).ensureAlpha().composite([{input:Buffer.from(svg),blend:'dest-in'}]).png().toBuffer();
 const hash = createHash('sha256').update(bytes).digest('hex').slice(0,12);
 const name = `320_${token}_drawstrings.${hash}.png`;
 await fs.writeFile(path.join(output,name),bytes);
 manifest[token] = `https://images.bottomslineclothing.com/editor/foregrounds/tultex320/${name}`;
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
