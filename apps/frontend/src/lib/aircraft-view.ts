import {
  derivePhase,
  type AircraftState,
  type FlightPhase,
  type FlightRoute,
} from '@skytrace/shared'
import type { TrackedAircraft } from '@/hooks/useLiveAircraft'
import { haversineMetres } from '@/lib/geo'

const METRES_TO_FEET = 3.28084
const MS_TO_KNOTS = 1.943844
const MS_TO_FEET_PER_MIN = 196.850394

export const PHASE_META: Record<FlightPhase, { label: string; color: string; dot: string }> = {
  cruising: { label: 'Cruising', color: 'text-sky-soft', dot: 'bg-sky-soft' },
  climbing: { label: 'Climbing', color: 'text-signal', dot: 'bg-signal' },
  descending: { label: 'Descending', color: 'text-amber-400', dot: 'bg-amber-400' },
  'on-ground': { label: 'On ground', color: 'text-muted', dot: 'bg-slate-400' },
}

export const PHASE_ORDER: FlightPhase[] = ['climbing', 'cruising', 'descending', 'on-ground']

export interface AircraftView {
  icao24: string
  callsign: string | null
  /** Best available human label: callsign, else registration, else the hex address. */
  label: string
  airlineName: string | null
  registration: string | null
  aircraftType: string | null
  manufacturer: string | null
  operator: string | null
  originCountry: string
  phase: FlightPhase

  altitudeFt: number | null
  speedKts: number | null
  verticalRateFpm: number | null
  heading: number | null

  route: FlightRoute | null
  /** Fraction of the great-circle route completed, 0-100, when the route is known. */
  progress: number | null
  distanceFlownKm: number | null
  distanceRemainingKm: number | null
  /** Minutes to destination at current ground speed. */
  etaMinutes: number | null

  photoUrl: string | null
  photoThumbnailUrl: string | null
  /** False while adsbdb has not yet answered for this airframe. */
  enriched: boolean

  state: AircraftState
}

/** Tail number when known (e.g. A6-FKJ), otherwise the live callsign or Mode-S hex. */
export function hoverLabel(tracked: TrackedAircraft): string {
  const registration = tracked.enrichment?.aircraft?.registration?.trim()
  if (registration) return registration.toUpperCase()
  if (tracked.state.callsign) return tracked.state.callsign.toUpperCase()
  return tracked.state.icao24.toUpperCase()
}

export function hoverLabels(aircraft: Map<string, TrackedAircraft>): Map<string, string> {
  const labels = new Map<string, string>()
  for (const [icao24, tracked] of aircraft) labels.set(icao24, hoverLabel(tracked))
  return labels
}

export function toAircraftView(tracked: TrackedAircraft): AircraftView {
  const { state, enrichment } = tracked
  const aircraft = enrichment?.aircraft ?? null
  const route = enrichment?.route ?? null

  const position = { lat: state.lat, lng: state.lng }
  let distanceFlownKm: number | null = null
  let distanceRemainingKm: number | null = null
  let progress: number | null = null
  let etaMinutes: number | null = null

  if (route) {
    const flownM = haversineMetres(route.origin, position)
    const remainingM = haversineMetres(position, route.destination)
    distanceFlownKm = flownM / 1000
    distanceRemainingKm = remainingM / 1000

    // Using flown / (flown + remaining) rather than flown / total keeps the figure sane
    // when an aircraft is holding or diverting well off the direct track.
    const total = flownM + remainingM
    if (total > 0) progress = Math.min(100, Math.max(0, (flownM / total) * 100))

    if (state.velocity !== null && state.velocity > 10 && !state.onGround) {
      etaMinutes = remainingM / state.velocity / 60
    }
  }

  return {
    icao24: state.icao24,
    callsign: state.callsign,
    label: state.callsign ?? aircraft?.registration ?? state.icao24.toUpperCase(),
    airlineName: route?.airline?.name ?? null,
    registration: aircraft?.registration ?? null,
    aircraftType: aircraft?.type ?? aircraft?.icaoType ?? null,
    manufacturer: aircraft?.manufacturer ?? null,
    operator: aircraft?.registeredOwner ?? null,
    originCountry: state.originCountry,
    phase: derivePhase(state),

    altitudeFt: state.baroAltitude !== null ? state.baroAltitude * METRES_TO_FEET : null,
    speedKts: state.velocity !== null ? state.velocity * MS_TO_KNOTS : null,
    verticalRateFpm:
      state.verticalRate !== null ? state.verticalRate * MS_TO_FEET_PER_MIN : null,
    heading: state.trueTrack,

    route,
    progress,
    distanceFlownKm,
    distanceRemainingKm,
    etaMinutes,

    photoUrl: aircraft?.photoUrl ?? null,
    photoThumbnailUrl: aircraft?.photoThumbnailUrl ?? null,
    enriched: enrichment !== null,

    state,
  }
}

/** Matches a free-text query against every identifier a user might reasonably type. */
export function matchesQuery(view: AircraftView, query: string): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    view.callsign,
    view.icao24,
    view.registration,
    view.airlineName,
    view.aircraftType,
    view.manufacturer,
    view.operator,
    view.originCountry,
    view.route?.origin.iata,
    view.route?.origin.icao,
    view.route?.origin.municipality,
    view.route?.destination.iata,
    view.route?.destination.icao,
    view.route?.destination.municipality,
  ]

  return haystack.some((value) => value !== null && value !== undefined && value.toLowerCase().includes(q))
}
