export type PickupAddress = {
  line1: string;
  line2: string;
  city: string;
  state: 'TN';
  postal_code: string;
  country: 'US';
};

export function cleanPickupAddress(value: unknown): PickupAddress {
  if (!value || typeof value !== 'object') throw new Error('Enter your Davidson County address for local pickup.');
  const input = value as Record<string, unknown>;
  const field = (key: string, max: number) => typeof input[key] === 'string' ? (input[key] as string).trim().slice(0, max + 1) : '';
  const line1 = field('line1', 120);
  const line2 = field('line2', 120);
  const city = field('city', 80);
  const postal_code = field('postal_code', 10);
  if (!line1 || !city || !/^\d{5}(?:-\d{4})?$/.test(postal_code) || line1.length > 120 || line2.length > 120 || city.length > 80) {
    throw new Error('Enter a complete Davidson County street address and ZIP code for local pickup.');
  }
  return { line1, line2, city, state: 'TN', postal_code, country: 'US' };
}

type CensusMatch = {
  addressComponents?: { zip?: string; state?: string };
  geographies?: { Counties?: Array<{ STATE?: string; COUNTY?: string }> };
};

export async function verifyDavidsonCounty(address: PickupAddress, fetcher: typeof fetch = fetch) {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/address');
  url.searchParams.set('street', address.line1);
  url.searchParams.set('city', address.city);
  url.searchParams.set('state', 'TN');
  url.searchParams.set('zip', address.postal_code.slice(0, 5));
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('layers', 'Counties');
  url.searchParams.set('format', 'json');
  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new Error('We could not verify your pickup address right now. Please try again or choose shipping.');
  }
  if (!response.ok) throw new Error('We could not verify your pickup address right now. Please try again or choose shipping.');
  let matches: CensusMatch[];
  try {
    const data = await response.json() as { result?: { addressMatches?: CensusMatch[] } };
    matches = data.result?.addressMatches ?? [];
  } catch {
    throw new Error('We could not verify your pickup address right now. Please try again or choose shipping.');
  }
  const zip = address.postal_code.slice(0, 5);
  if (matches.length !== 1 || matches[0].addressComponents?.zip !== zip ||
    !matches[0].geographies?.Counties?.some((county) => county.STATE === '47' && county.COUNTY === '037')) {
    throw new Error('Local pickup is available only for verified Davidson County, TN addresses. Please check your address or choose shipping.');
  }
}
