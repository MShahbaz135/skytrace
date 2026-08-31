/**
 * Default map framing for a visitor's country.
 *
 * IP geolocation is preferred (no browser permission prompt). Timezone is a last resort
 * when the IP lookup is blocked or times out. Unknown countries fall back to the IP
 * coordinates at a mid zoom rather than a global view.
 */

export interface MapView {
  center: [number, number]
  zoom: number
  /** Southwest then northeast, for Leaflet fitBounds. */
  bounds?: [[number, number], [number, number]]
}

export const FALLBACK_VIEW: MapView = {
  center: [48, 8],
  zoom: 5,
}

/** ISO 3166-1 alpha-2 → a view that frames the country, not a single city. */
const COUNTRY_VIEWS: Record<string, MapView> = {
  AE: { center: [24.3, 54.3], zoom: 7, bounds: [[22.6, 51.5], [26.1, 56.4]] },
  AF: { center: [33.9, 66.0], zoom: 6, bounds: [[29.4, 60.5], [38.5, 74.9]] },
  AR: { center: [-38.4, -63.6], zoom: 4, bounds: [[-55.1, -73.6], [-21.8, -53.6]] },
  AT: { center: [47.6, 14.1], zoom: 7, bounds: [[46.4, 9.5], [49.0, 17.2]] },
  AU: { center: [-25.3, 133.8], zoom: 4, bounds: [[-43.7, 112.9], [-10.0, 153.6]] },
  BD: { center: [23.7, 90.4], zoom: 7, bounds: [[20.7, 88.0], [26.6, 92.7]] },
  BE: { center: [50.5, 4.5], zoom: 8, bounds: [[49.5, 2.5], [51.5, 6.4]] },
  BG: { center: [42.7, 25.5], zoom: 7, bounds: [[41.2, 22.4], [44.2, 28.6]] },
  BR: { center: [-14.2, -51.9], zoom: 4, bounds: [[-33.8, -73.9], [5.3, -32.4]] },
  CA: { center: [56.1, -106.3], zoom: 3, bounds: [[41.7, -141.0], [83.1, -52.6]] },
  CH: { center: [46.8, 8.2], zoom: 8, bounds: [[45.8, 5.96], [47.8, 10.5]] },
  CN: { center: [35.9, 104.2], zoom: 4, bounds: [[18.2, 73.5], [53.6, 134.8]] },
  CZ: { center: [49.8, 15.5], zoom: 7, bounds: [[48.6, 12.1], [51.1, 18.9]] },
  DE: { center: [51.2, 10.5], zoom: 6, bounds: [[47.3, 5.9], [55.1, 15.0]] },
  DK: { center: [56.3, 9.5], zoom: 7, bounds: [[54.6, 8.1], [57.8, 15.2]] },
  EG: { center: [26.8, 30.8], zoom: 6, bounds: [[22.0, 24.7], [31.7, 36.9]] },
  ES: { center: [40.5, -3.7], zoom: 6, bounds: [[36.0, -9.3], [43.8, 4.3]] },
  FI: { center: [64.0, 26.0], zoom: 5, bounds: [[59.8, 20.6], [70.1, 31.6]] },
  FR: { center: [46.6, 2.2], zoom: 6, bounds: [[41.3, -5.1], [51.1, 9.6]] },
  GB: { center: [54.6, -3.4], zoom: 6, bounds: [[49.9, -8.2], [60.9, 1.8]] },
  GR: { center: [39.1, 23.0], zoom: 6, bounds: [[34.8, 19.4], [41.8, 29.6]] },
  HK: { center: [22.4, 114.1], zoom: 10, bounds: [[22.1, 113.8], [22.6, 114.4]] },
  HU: { center: [47.2, 19.5], zoom: 7, bounds: [[45.7, 16.1], [48.6, 22.9]] },
  ID: { center: [-2.5, 118.0], zoom: 5, bounds: [[-11.0, 95.0], [6.0, 141.0]] },
  IE: { center: [53.4, -8.2], zoom: 7, bounds: [[51.4, -10.5], [55.4, -6.0]] },
  IL: { center: [31.4, 35.0], zoom: 8, bounds: [[29.5, 34.2], [33.3, 35.9]] },
  IN: { center: [22.4, 79.0], zoom: 5, bounds: [[6.8, 68.1], [35.5, 97.4]] },
  IQ: { center: [33.2, 43.7], zoom: 6, bounds: [[29.1, 38.8], [37.4, 48.6]] },
  IR: { center: [32.4, 53.7], zoom: 5, bounds: [[25.1, 44.0], [39.8, 63.3]] },
  IT: { center: [42.8, 12.6], zoom: 6, bounds: [[36.6, 6.6], [47.1, 18.5]] },
  JO: { center: [31.3, 36.8], zoom: 7, bounds: [[29.2, 34.9], [33.4, 39.3]] },
  JP: { center: [36.2, 138.3], zoom: 5, bounds: [[24.2, 122.9], [45.5, 145.8]] },
  KE: { center: [0.0, 37.9], zoom: 6, bounds: [[-4.7, 33.9], [4.6, 41.9]] },
  KR: { center: [36.4, 127.8], zoom: 7, bounds: [[33.1, 124.6], [38.6, 131.9]] },
  KW: { center: [29.3, 47.5], zoom: 8, bounds: [[28.5, 46.5], [30.1, 48.4]] },
  KZ: { center: [48.0, 67.0], zoom: 5, bounds: [[40.6, 46.5], [55.4, 87.3]] },
  LK: { center: [7.9, 80.8], zoom: 7, bounds: [[5.9, 79.7], [9.8, 81.9]] },
  MX: { center: [23.6, -102.5], zoom: 5, bounds: [[14.5, -118.4], [32.7, -86.7]] },
  MY: { center: [4.2, 109.5], zoom: 6, bounds: [[0.9, 99.6], [7.4, 119.3]] },
  NG: { center: [9.1, 8.7], zoom: 6, bounds: [[4.3, 2.7], [13.9, 14.7]] },
  NL: { center: [52.1, 5.3], zoom: 8, bounds: [[50.8, 3.4], [53.6, 7.2]] },
  NO: { center: [64.6, 17.8], zoom: 4, bounds: [[57.9, 4.6], [71.2, 31.1]] },
  NP: { center: [28.4, 84.1], zoom: 7, bounds: [[26.3, 80.1], [30.4, 88.2]] },
  NZ: { center: [-40.9, 174.9], zoom: 5, bounds: [[-47.3, 166.4], [-34.4, 178.6]] },
  OM: { center: [21.5, 55.9], zoom: 6, bounds: [[16.6, 52.0], [26.4, 59.8]] },
  PH: { center: [12.9, 121.8], zoom: 6, bounds: [[4.6, 116.9], [21.1, 126.6]] },
  PK: { center: [30.4, 69.3], zoom: 6, bounds: [[23.54, 60.87], [37.08, 77.84]] },
  PL: { center: [52.0, 19.1], zoom: 6, bounds: [[49.0, 14.1], [54.8, 24.1]] },
  PT: { center: [39.4, -8.2], zoom: 7, bounds: [[36.96, -9.5], [42.2, -6.2]] },
  QA: { center: [25.3, 51.2], zoom: 9, bounds: [[24.5, 50.7], [26.2, 51.6]] },
  RO: { center: [45.9, 25.0], zoom: 6, bounds: [[43.6, 20.3], [48.3, 29.7]] },
  RU: { center: [61.5, 105.3], zoom: 3, bounds: [[41.2, 19.6], [81.9, 180.0]] },
  SA: { center: [23.9, 45.1], zoom: 5, bounds: [[16.3, 34.5], [32.2, 55.7]] },
  SE: { center: [62.2, 17.6], zoom: 5, bounds: [[55.3, 11.1], [69.1, 24.2]] },
  SG: { center: [1.35, 103.82], zoom: 11, bounds: [[1.2, 103.6], [1.47, 104.1]] },
  TH: { center: [15.9, 101.0], zoom: 6, bounds: [[5.6, 97.3], [20.5, 105.6]] },
  TR: { center: [39.0, 35.2], zoom: 6, bounds: [[35.8, 25.7], [42.1, 44.8]] },
  TW: { center: [23.7, 121.0], zoom: 7, bounds: [[21.9, 120.0], [25.3, 122.0]] },
  UA: { center: [48.4, 31.2], zoom: 6, bounds: [[44.4, 22.1], [52.4, 40.2]] },
  US: { center: [39.8, -98.6], zoom: 4, bounds: [[24.5, -125.0], [49.4, -66.9]] },
  VN: { center: [16.0, 106.0], zoom: 6, bounds: [[8.4, 102.1], [23.4, 109.5]] },
  ZA: { center: [-30.6, 22.9], zoom: 5, bounds: [[-34.8, 16.5], [-22.1, 32.9]] },
}

/**
 * IANA timezone → country code. Used only when IP geolocation is unavailable.
 * Ambiguous zones (Europe/London serving multiple countries) still beat a world view.
 */
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Kathmandu': 'NP',
  'Asia/Colombo': 'LK',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Muscat': 'OM',
  'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO',
  'Asia/Jerusalem': 'IL',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Taipei': 'TW',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG',
  'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Mexico_City': 'MX',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Cairo': 'EG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
}

export function viewForCountry(
  countryCode: string | null,
  fallbackCoords?: { lat: number; lng: number },
): MapView {
  const code = countryCode?.trim().toUpperCase() ?? ''
  if (code && COUNTRY_VIEWS[code]) return COUNTRY_VIEWS[code]
  if (fallbackCoords && Number.isFinite(fallbackCoords.lat) && Number.isFinite(fallbackCoords.lng)) {
    return { center: [fallbackCoords.lat, fallbackCoords.lng], zoom: 6 }
  }
  return FALLBACK_VIEW
}

export function countryFromTimezone(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string | null {
  return TIMEZONE_COUNTRY[timeZone] ?? null
}

interface IpLookup {
  countryCode: string | null
  lat: number | null
  lng: number | null
}

async function lookupIpwhois(signal: AbortSignal): Promise<IpLookup | null> {
  const response = await fetch('https://ipwho.is/', { signal })
  if (!response.ok) return null
  const body = (await response.json()) as {
    success?: boolean
    country_code?: string
    latitude?: number
    longitude?: number
  }
  if (body.success === false) return null
  return {
    countryCode: body.country_code ?? null,
    lat: body.latitude ?? null,
    lng: body.longitude ?? null,
  }
}

async function lookupIpapi(signal: AbortSignal): Promise<IpLookup | null> {
  const response = await fetch('https://ipapi.co/json/', { signal })
  if (!response.ok) return null
  const body = (await response.json()) as {
    country_code?: string
    latitude?: number
    longitude?: number
    error?: boolean
  }
  if (body.error) return null
  return {
    countryCode: body.country_code ?? null,
    lat: body.latitude ?? null,
    lng: body.longitude ?? null,
  }
}

/** Resolves a map view for the current visitor. Safe to call from the browser. */
let inFlight: Promise<MapView> | null = null
let resolved: MapView | null = null

export function peekVisitorView(): MapView | null {
  return resolved
}

export function detectVisitorView(timeoutMs = 2500): Promise<MapView> {
  if (resolved) return Promise.resolve(resolved)
  inFlight ??= detectVisitorViewOnce(timeoutMs).then((view) => {
    resolved = view
    return view
  })
  return inFlight
}

async function detectVisitorViewOnce(timeoutMs: number): Promise<MapView> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const lookups = (async (): Promise<MapView> => {
    const ip = (await lookupIpwhois(controller.signal).catch(() => null))
      ?? (await lookupIpapi(controller.signal).catch(() => null))

    if (ip?.countryCode || (ip?.lat != null && ip?.lng != null)) {
      return viewForCountry(
        ip.countryCode,
        ip.lat != null && ip.lng != null ? { lat: ip.lat, lng: ip.lng } : undefined,
      )
    }

    return viewForCountry(countryFromTimezone())
  })()

  const timeout = new Promise<MapView>((resolve) => {
    setTimeout(() => resolve(viewForCountry(countryFromTimezone())), timeoutMs)
  })

  try {
    return await Promise.race([lookups, timeout])
  } finally {
    clearTimeout(timer)
  }
}
