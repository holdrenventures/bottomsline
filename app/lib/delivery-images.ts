import manifest from './delivery-image-manifest.json' with { type: 'json' };

type DeliveryRecord = { src: string; width: number; height: number };

type DeliveryManifest = {
  generatedAt?: string;
  maxWidth?: number;
  images: Record<string, DeliveryRecord>;
};

const images = (manifest as DeliveryManifest).images ?? {};
const bySrc = new Map<string, DeliveryRecord>();
for (const record of Object.values(images)) {
  if (!bySrc.has(record.src)) bySrc.set(record.src, record);
}

function pathOf(url: string) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function recordFor(url: string | null | undefined) {
  if (!url) return null;
  return images[url] ?? images[pathOf(url)] ?? bySrc.get(url) ?? bySrc.get(pathOf(url)) ?? null;
}

/** Swap a known heavy PNG for the resized WebP copy, when one was built. */
export function optimizeDelivery(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  return recordFor(url)?.src ?? url;
}

export function imageDimensions(url: string | null | undefined): { width: number; height: number } | null {
  const record = recordFor(url);
  if (!record) return null;
  return { width: record.width, height: record.height };
}

export function imageAttrs(url: string | null | undefined): { width?: number; height?: number } {
  const size = imageDimensions(url);
  return size ? { width: size.width, height: size.height } : {};
}
