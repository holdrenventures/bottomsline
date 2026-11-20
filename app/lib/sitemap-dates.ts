export function sitemapDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function latestSitemapDate(values: Array<string | null | undefined>) {
  const times = values.map(sitemapDate).flatMap((date) => date ? [date.getTime()] : []);
  return times.length ? new Date(Math.max(...times)) : undefined;
}
