import { describe, expect, it } from 'vitest'
import type { AircraftState } from '@skytrace/shared'
import { haversineMetres } from './geo'
import { PositionInterpolator } from './interpolation'

const FIX_SECONDS = 1_700_000_000
const FIX_MS = FIX_SECONDS * 1000

function state(overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: 'abc123',
    callsign: 'TEST1',
    originCountry: 'Testland',
    lat: 50,
    lng: 0,
    baroAltitude: 10_000,
    geoAltitude: 10_200,
    velocity: 250,
    trueTrack: 90,
    verticalRate: 0,
    onGround: false,
    lastContact: FIX_SECONDS,
    timePosition: FIX_SECONDS,
    squawk: null,
    ...overrides,
  }
}

describe('PositionInterpolator dead reckoning', () => {
  it('reports the reported position at the moment of the fix', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state(), FIX_MS)

    const sample = interpolator.sample('abc123', FIX_MS)

    expect(sample?.lat).toBeCloseTo(50, 6)
    expect(sample?.lng).toBeCloseTo(0, 6)
    expect(sample?.heading).toBe(90)
  })

  it('projects forward at ground speed along the reported track', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state(), FIX_MS)

    // Ten seconds at 250 m/s is 2.5 km further east.
    const sample = interpolator.sample('abc123', FIX_MS + 10_000)!
    const travelled = haversineMetres({ lat: 50, lng: 0 }, sample)

    expect(travelled).toBeCloseTo(2500, 0)
    expect(sample.lng).toBeGreaterThan(0)
    expect(sample.lat).toBeCloseTo(50, 3)
  })

  it('refuses to extrapolate indefinitely when the feed stalls', () => {
    const interpolator = new PositionInterpolator({ maxExtrapolationSec: 120 })
    interpolator.upsert(state(), FIX_MS)

    const capped = interpolator.sample('abc123', FIX_MS + 120_000)!
    const wayLater = interpolator.sample('abc123', FIX_MS + 600_000)!

    expect(wayLater.lat).toBeCloseTo(capped.lat, 9)
    expect(wayLater.lng).toBeCloseTo(capped.lng, 9)
  })

  it('holds position for aircraft on the ground', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state({ onGround: true, velocity: 30 }), FIX_MS)

    const sample = interpolator.sample('abc123', FIX_MS + 60_000)!

    expect(sample.lat).toBe(50)
    expect(sample.lng).toBe(0)
  })

  it('holds position when track or speed was not broadcast', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state({ trueTrack: null }), FIX_MS)
    interpolator.upsert(state({ icao24: 'def456', velocity: null }), FIX_MS)

    expect(interpolator.sample('abc123', FIX_MS + 30_000)?.lng).toBe(0)
    expect(interpolator.sample('def456', FIX_MS + 30_000)?.lng).toBe(0)
  })

  it('uses the position report time rather than the last contact time', () => {
    const interpolator = new PositionInterpolator()
    // The position is 20 seconds older than the most recent transponder message.
    interpolator.upsert(state({ timePosition: FIX_SECONDS - 20 }), FIX_MS)

    const sample = interpolator.sample('abc123', FIX_MS)!
    const travelled = haversineMetres({ lat: 50, lng: 0 }, sample)

    expect(travelled).toBeCloseTo(250 * 20, 0)
  })
})

describe('PositionInterpolator correction smoothing', () => {
  it('eases onto a corrected position instead of snapping to it', () => {
    const interpolator = new PositionInterpolator({ correctionMs: 1000 })
    interpolator.upsert(state(), FIX_MS)

    const before = interpolator.sample('abc123', FIX_MS + 10_000)!

    // A fresh fix arrives placing the aircraft well north of where it was drawn.
    const jumpTime = FIX_MS + 10_000
    interpolator.upsert(
      state({ lat: 51, lng: before.lng, timePosition: jumpTime / 1000, lastContact: jumpTime / 1000 }),
      jumpTime,
    )

    const immediately = interpolator.sample('abc123', jumpTime)!
    const midway = interpolator.sample('abc123', jumpTime + 500)!
    const settled = interpolator.sample('abc123', jumpTime + 1000)!

    expect(immediately.lat).toBeCloseTo(before.lat, 6)
    expect(midway.lat).toBeGreaterThan(before.lat)
    expect(midway.lat).toBeLessThan(51)
    expect(settled.lat).toBeCloseTo(51, 6)
  })

  it('turns the short way round when a heading correction crosses north', () => {
    const interpolator = new PositionInterpolator({ correctionMs: 1000 })
    interpolator.upsert(state({ trueTrack: 350 }), FIX_MS)
    interpolator.upsert(state({ trueTrack: 10 }), FIX_MS)

    const midway = interpolator.sample('abc123', FIX_MS + 500)!

    // Going the long way would pass through 180.
    expect(midway.heading > 350 || midway.heading < 10).toBe(true)
  })

  it('places a newly seen aircraft directly at its projected position', () => {
    const interpolator = new PositionInterpolator({ correctionMs: 1000 })
    interpolator.upsert(state(), FIX_MS + 10_000)

    const sample = interpolator.sample('abc123', FIX_MS + 10_000)!
    const travelled = haversineMetres({ lat: 50, lng: 0 }, sample)

    expect(travelled).toBeCloseTo(2500, 0)
  })
})

describe('PositionInterpolator bookkeeping', () => {
  it('tracks and removes aircraft', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state(), FIX_MS)
    interpolator.upsert(state({ icao24: 'def456' }), FIX_MS)

    expect(interpolator.size).toBe(2)

    interpolator.remove('abc123')

    expect(interpolator.size).toBe(1)
    expect(interpolator.sample('abc123', FIX_MS)).toBeNull()
  })

  it('drops everything outside the retained set', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state(), FIX_MS)
    interpolator.upsert(state({ icao24: 'def456' }), FIX_MS)
    interpolator.upsert(state({ icao24: 'ghi789' }), FIX_MS)

    interpolator.retain(new Set(['def456']))

    expect(interpolator.size).toBe(1)
    expect(interpolator.has('def456')).toBe(true)
  })

  it('samples every aircraft into a reused map', () => {
    const interpolator = new PositionInterpolator()
    interpolator.upsert(state(), FIX_MS)
    interpolator.upsert(state({ icao24: 'def456', lat: 40 }), FIX_MS)

    const out = new Map()
    interpolator.sampleAllInto(out, FIX_MS)
    expect(out.size).toBe(2)

    interpolator.remove('def456')
    interpolator.sampleAllInto(out, FIX_MS)
    expect(out.size).toBe(1)
  })
})
