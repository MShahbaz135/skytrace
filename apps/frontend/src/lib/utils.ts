export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** Placeholder shown wherever the transponder did not broadcast a value. */
export const NO_DATA = '—'

export function formatAltitude(feet: number | null): string {
  if (feet === null) return NO_DATA
  return formatNumber(Math.round(feet / 25) * 25)
}

export function formatSpeed(knots: number | null): string {
  if (knots === null) return NO_DATA
  return formatNumber(Math.round(knots))
}

export function formatVerticalRate(feetPerMinute: number | null): string {
  if (feetPerMinute === null) return NO_DATA
  const rounded = Math.round(feetPerMinute / 50) * 50
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}`
}

export function formatDistance(kilometres: number | null): string {
  if (kilometres === null) return NO_DATA
  if (kilometres < 10) return `${kilometres.toFixed(1)} km`
  return `${formatNumber(Math.round(kilometres))} km`
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return NO_DATA
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`
}

/** Clock time of arrival, given minutes remaining from now. */
export function formatEtaClock(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return NO_DATA
  const arrival = new Date(Date.now() + minutes * 60_000)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(arrival)
}

/** Compact "how long ago", used for the data-age indicator. */
export function formatAge(timestampMs: number | null): string {
  if (timestampMs === null) return NO_DATA
  const seconds = Math.max(0, Math.round((Date.now() - timestampMs) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}
