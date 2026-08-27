import { describe, expect, it } from 'vitest'
import {
  destinationPoint,
  greatCirclePath,
  haversineMetres,
  initialBearing,
  lerpAngle,
  lerpLongitude,
  normaliseHeading,
  normaliseLongitude,
} from './geo'

const LONDON = { lat: 51.4775, lng: -0.4614 } // EGLL
const NEW_YORK = { lat: 40.6413, lng: -73.7781 } // KJFK
const SYDNEY = { lat: -33.9399, lng: 151.1753 } // YSSY

describe('haversineMetres', () => {
  it('matches the published great-circle distance for London to New York', () => {
    // Reference figure is 5,539 km; allow a few kilometres for radius model differences.
    const km = haversineMetres(LONDON, NEW_YORK) / 1000
    expect(km).toBeGreaterThan(5530)
    expect(km).toBeLessThan(5550)
  })

  it('matches the published distance for London to Sydney', () => {
    const km = haversineMetres(LONDON, SYDNEY) / 1000
    expect(km).toBeGreaterThan(16_980)
    expect(km).toBeLessThan(17_030)
  })

  it('is zero for coincident points and symmetric otherwise', () => {
    expect(haversineMetres(LONDON, LONDON)).toBe(0)
    expect(haversineMetres(LONDON, NEW_YORK)).toBeCloseTo(haversineMetres(NEW_YORK, LONDON), 6)
  })

  it('measures one degree of latitude as roughly 111 km', () => {
    const km = haversineMetres({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000
    expect(km).toBeCloseTo(111.2, 1)
  })
})

describe('initialBearing', () => {
  it('points due east along the equator', () => {
    expect(initialBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(90, 6)
  })

  it('points due north along a meridian', () => {
    expect(initialBearing({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(0, 6)
  })

  it('leaves London for New York on a north-westerly heading', () => {
    // The great circle initially heads well north of due west, which is why the route
    // arcs over Canada rather than running flat across the Atlantic.
    const bearing = initialBearing(LONDON, NEW_YORK)
    expect(bearing).toBeGreaterThan(280)
    expect(bearing).toBeLessThan(295)
  })
})

describe('destinationPoint', () => {
  it('returns the origin for zero distance', () => {
    expect(destinationPoint(LONDON, 90, 0)).toEqual({ lat: LONDON.lat, lng: LONDON.lng })
  })

  it('moves the expected distance in the expected direction', () => {
    const start = { lat: 0, lng: 0 }
    const result = destinationPoint(start, 90, 111_195)

    expect(result.lat).toBeCloseTo(0, 6)
    expect(result.lng).toBeCloseTo(1, 3)
  })

  it('round-trips against haversine', () => {
    const distance = 250_000
    const result = destinationPoint(LONDON, 45, distance)

    expect(haversineMetres(LONDON, result)).toBeCloseTo(distance, 0)
  })

  it('agrees with the bearing used to generate it', () => {
    const result = destinationPoint(LONDON, 137, 400_000)
    expect(initialBearing(LONDON, result)).toBeCloseTo(137, 4)
  })

  it('wraps longitude when crossing the antimeridian', () => {
    const result = destinationPoint({ lat: 0, lng: 179 }, 90, 400_000)

    expect(result.lng).toBeLessThan(0)
    expect(result.lng).toBeGreaterThan(-180)
  })

  it('projects a realistic distance for ten seconds of cruise', () => {
    // 250 m/s for 10s is 2.5 km, the gap the interpolator has to cover between updates.
    const result = destinationPoint(LONDON, 90, 250 * 10)
    expect(haversineMetres(LONDON, result)).toBeCloseTo(2500, 0)
  })
})

describe('angle and longitude wrapping', () => {
  it('normalises headings into a single turn', () => {
    expect(normaliseHeading(370)).toBe(10)
    expect(normaliseHeading(-10)).toBe(350)
    expect(normaliseHeading(360)).toBe(0)
  })

  it('normalises longitudes into the mapped range', () => {
    expect(normaliseLongitude(190)).toBe(-170)
    expect(normaliseLongitude(-190)).toBe(170)
  })

  it('interpolates headings the short way round', () => {
    expect(lerpAngle(10, 50, 0.5)).toBeCloseTo(30, 6)
    // 350 to 10 is a 20 degree turn through north, not a 340 degree turn the other way.
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 6)
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0, 6)
  })

  it('interpolates longitudes across the antimeridian', () => {
    // The midpoint of 179 and -179 is the antimeridian itself, reported as -180 because
    // the normalised range is half-open.
    expect(Math.abs(lerpLongitude(179, -179, 0.5))).toBeCloseTo(180, 6)
    expect(lerpLongitude(-10, 10, 0.5)).toBeCloseTo(0, 6)
  })
})

describe('greatCirclePath', () => {
  it('starts and ends at the requested endpoints', () => {
    const path = greatCirclePath(LONDON, NEW_YORK, 32)

    expect(path).toHaveLength(33)
    expect(path[0].lat).toBeCloseTo(LONDON.lat, 6)
    expect(path[0].lng).toBeCloseTo(LONDON.lng, 6)
    expect(path[32].lat).toBeCloseTo(NEW_YORK.lat, 6)
    expect(path[32].lng).toBeCloseTo(NEW_YORK.lng, 6)
  })

  it('arcs poleward rather than running straight across in latitude', () => {
    const path = greatCirclePath(LONDON, NEW_YORK, 32)
    const midpoint = path[16]
    const straightLineLat = (LONDON.lat + NEW_YORK.lat) / 2

    expect(midpoint.lat).toBeGreaterThan(straightLineLat)
  })

  it('degrades gracefully for coincident endpoints', () => {
    expect(greatCirclePath(LONDON, LONDON, 8)).toEqual([LONDON, LONDON])
  })
})
