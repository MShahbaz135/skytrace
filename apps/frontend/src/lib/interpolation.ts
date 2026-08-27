import type { AircraftState } from '@skytrace/shared'
import { destinationPoint, lerp, lerpAngle, lerpLongitude } from '@/lib/geo'

export interface Sample {
  lat: number
  lng: number
  heading: number
}

export interface InterpolatorOptions {
  /** How long to ease from the previously drawn position onto a freshly received one. */
  correctionMs?: number
  /** Ceiling on forward projection, so a stalled feed does not fly aircraft into the ocean. */
  maxExtrapolationSec?: number
}

interface Entry {
  state: AircraftState
  /** Where this aircraft was drawn when its latest state arrived. */
  fromLat: number
  fromLng: number
  fromHeading: number
  correctionStartMs: number
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * Turns a slow stream of authoritative fixes into continuous motion.
 *
 * Upstream positions arrive roughly every ten seconds, which looks like teleporting if
 * drawn directly. Between updates each aircraft is dead-reckoned forward from its own fix
 * time along its reported track at its reported ground speed. When a real fix lands it is
 * rarely exactly where the projection had reached, so the difference is eased out over a
 * few hundred milliseconds instead of being snapped.
 */
export class PositionInterpolator {
  private readonly entries = new Map<string, Entry>()
  private readonly correctionMs: number
  private readonly maxExtrapolationSec: number

  constructor(options: InterpolatorOptions = {}) {
    this.correctionMs = options.correctionMs ?? 700
    this.maxExtrapolationSec = options.maxExtrapolationSec ?? 120
  }

  get size(): number {
    return this.entries.size
  }

  has(icao24: string): boolean {
    return this.entries.has(icao24)
  }

  upsert(state: AircraftState, nowMs: number = Date.now()): void {
    const existing = this.entries.get(state.icao24)

    if (!existing) {
      const start = this.deadReckon(state, nowMs)
      this.entries.set(state.icao24, {
        state,
        fromLat: start.lat,
        fromLng: start.lng,
        fromHeading: start.heading,
        // Already at the projected position, so no correction is pending.
        correctionStartMs: nowMs - this.correctionMs,
      })
      return
    }

    const current = this.sampleEntry(existing, nowMs)
    existing.state = state
    existing.fromLat = current.lat
    existing.fromLng = current.lng
    existing.fromHeading = current.heading
    existing.correctionStartMs = nowMs
  }

  remove(icao24: string): void {
    this.entries.delete(icao24)
  }

  /** Drops everything not in `keep`, used when a snapshot replaces the tracked set. */
  retain(keep: Set<string>): void {
    for (const icao24 of this.entries.keys()) {
      if (!keep.has(icao24)) this.entries.delete(icao24)
    }
  }

  clear(): void {
    this.entries.clear()
  }

  sample(icao24: string, nowMs: number = Date.now()): Sample | null {
    const entry = this.entries.get(icao24)
    return entry ? this.sampleEntry(entry, nowMs) : null
  }

  /** Writes every current position into `out`, reusing the map to avoid per-frame allocation. */
  sampleAllInto(out: Map<string, Sample>, nowMs: number = Date.now()): Map<string, Sample> {
    out.clear()
    for (const [icao24, entry] of this.entries) {
      out.set(icao24, this.sampleEntry(entry, nowMs))
    }
    return out
  }

  private sampleEntry(entry: Entry, nowMs: number): Sample {
    const target = this.deadReckon(entry.state, nowMs)
    if (this.correctionMs <= 0) return target

    const progress = (nowMs - entry.correctionStartMs) / this.correctionMs
    if (progress >= 1) return target
    if (progress <= 0) {
      return { lat: entry.fromLat, lng: entry.fromLng, heading: entry.fromHeading }
    }

    const t = easeOutCubic(progress)
    return {
      lat: lerp(entry.fromLat, target.lat, t),
      lng: lerpLongitude(entry.fromLng, target.lng, t),
      heading: lerpAngle(entry.fromHeading, target.heading, t),
    }
  }

  /** Projects a fix forward to `nowMs` along its reported track. */
  private deadReckon(state: AircraftState, nowMs: number): Sample {
    const heading = state.trueTrack ?? 0
    const fixSeconds = state.timePosition ?? state.lastContact
    const speed = state.velocity

    if (state.onGround || speed === null || speed <= 0 || state.trueTrack === null) {
      return { lat: state.lat, lng: state.lng, heading }
    }

    const elapsedSec = Math.min(
      this.maxExtrapolationSec,
      Math.max(0, nowMs / 1000 - fixSeconds),
    )
    if (elapsedSec === 0) return { lat: state.lat, lng: state.lng, heading }

    const projected = destinationPoint({ lat: state.lat, lng: state.lng }, heading, speed * elapsedSec)
    return { lat: projected.lat, lng: projected.lng, heading }
  }
}
