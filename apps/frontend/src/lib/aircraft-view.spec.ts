import { describe, expect, it } from 'vitest'
import type {
  AircraftEnrichment,
  AircraftState,
  Airport,
  FlightRoute,
} from '@skytrace/shared'
import type { TrackedAircraft } from '@/hooks/useLiveAircraft'
import { hoverLabel, matchesQuery, toAircraftView } from './aircraft-view'

function airport(icao: string, iata: string, lat: number, lng: number): Airport {
  return {
    icao,
    iata,
    name: `${iata} International`,
    municipality: iata === 'LHR' ? 'London' : 'New York',
    countryName: null,
    countryIso: null,
    lat,
    lng,
    elevation: null,
  }
}

const LHR = airport('EGLL', 'LHR', 51.4775, -0.4614)
const JFK = airport('KJFK', 'JFK', 40.6413, -73.7781)

function state(overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: '4008f2',
    callsign: 'BAW117',
    originCountry: 'United Kingdom',
    lat: 51.4775,
    lng: -0.4614,
    baroAltitude: 10_668, // 35,000 ft
    geoAltitude: 10_800,
    velocity: 250, // ~486 kts
    trueTrack: 285,
    verticalRate: 0,
    onGround: false,
    lastContact: 1_700_000_000,
    timePosition: 1_700_000_000,
    squawk: '2000',
    ...overrides,
  }
}

function enrichment(route: FlightRoute | null): AircraftEnrichment {
  return {
    icao24: '4008f2',
    callsign: 'BAW117',
    aircraft: {
      icao24: '4008f2',
      registration: 'G-STBA',
      type: 'Boeing 777-336ER',
      icaoType: 'B77W',
      manufacturer: 'Boeing',
      registeredOwner: 'British Airways',
      ownerCountryName: 'United Kingdom',
      ownerCountryIso: 'GB',
      photoUrl: 'https://example.test/photo.jpg',
      photoThumbnailUrl: 'https://example.test/thumb.jpg',
    },
    route,
  }
}

const ROUTE: FlightRoute = {
  callsign: 'BAW117',
  callsignIcao: 'BAW117',
  callsignIata: 'BA117',
  airline: {
    name: 'British Airways',
    icao: 'BAW',
    iata: 'BA',
    country: 'United Kingdom',
    radioCallsign: 'SPEEDBIRD',
  },
  origin: LHR,
  midpoint: null,
  destination: JFK,
}

function tracked(overrides: Partial<TrackedAircraft> = {}): TrackedAircraft {
  return { state: state(), enrichment: null, ...overrides }
}

describe('toAircraftView unit conversion', () => {
  it('converts ADS-B metric units into the aviation units the UI displays', () => {
    const view = toAircraftView(tracked())

    expect(view.altitudeFt).toBeCloseTo(35_000, 0)
    expect(view.speedKts).toBeCloseTo(486, 0)
    expect(view.heading).toBe(285)
  })

  it('converts vertical rate to feet per minute, keeping the sign', () => {
    const climbing = toAircraftView(tracked({ state: state({ verticalRate: 10 }) }))
    const descending = toAircraftView(tracked({ state: state({ verticalRate: -10 }) }))

    expect(climbing.verticalRateFpm).toBeCloseTo(1968.5, 1)
    expect(descending.verticalRateFpm).toBeCloseTo(-1968.5, 1)
  })

  it('leaves values absent rather than defaulting them to zero', () => {
    const view = toAircraftView(
      tracked({ state: state({ baroAltitude: null, velocity: null, trueTrack: null }) }),
    )

    expect(view.altitudeFt).toBeNull()
    expect(view.speedKts).toBeNull()
    expect(view.heading).toBeNull()
  })
})

describe('toAircraftView flight phase', () => {
  it('derives phase from ground state and vertical rate', () => {
    expect(toAircraftView(tracked({ state: state({ onGround: true }) })).phase).toBe('on-ground')
    expect(toAircraftView(tracked({ state: state({ verticalRate: 5 }) })).phase).toBe('climbing')
    expect(toAircraftView(tracked({ state: state({ verticalRate: -5 }) })).phase).toBe(
      'descending',
    )
    expect(toAircraftView(tracked({ state: state({ verticalRate: 0.4 }) })).phase).toBe(
      'cruising',
    )
  })
})

describe('toAircraftView labelling', () => {
  it('prefers the callsign', () => {
    expect(toAircraftView(tracked()).label).toBe('BAW117')
  })

  it('falls back to registration, then to the Mode-S address', () => {
    const noCallsign = tracked({
      state: state({ callsign: null }),
      enrichment: enrichment(null),
    })
    expect(toAircraftView(noCallsign).label).toBe('G-STBA')

    expect(toAircraftView(tracked({ state: state({ callsign: null }) })).label).toBe('4008F2')
  })

  it('marks an aircraft as unenriched until adsbdb has answered', () => {
    expect(toAircraftView(tracked()).enriched).toBe(false)
    expect(toAircraftView(tracked({ enrichment: enrichment(ROUTE) })).enriched).toBe(true)
  })
})

describe('toAircraftView route progress', () => {
  it('leaves progress unknown without a route', () => {
    const view = toAircraftView(tracked({ enrichment: enrichment(null) }))

    expect(view.progress).toBeNull()
    expect(view.etaMinutes).toBeNull()
    expect(view.distanceRemainingKm).toBeNull()
  })

  it('reports zero progress at the origin and full progress at the destination', () => {
    const atOrigin = toAircraftView(tracked({ enrichment: enrichment(ROUTE) }))
    expect(atOrigin.progress).toBeCloseTo(0, 3)

    const atDestination = toAircraftView(
      tracked({
        state: state({ lat: JFK.lat, lng: JFK.lng }),
        enrichment: enrichment(ROUTE),
      }),
    )
    expect(atDestination.progress).toBeCloseTo(100, 3)
  })

  it('reports roughly half way at the midpoint of the route', () => {
    const view = toAircraftView(
      tracked({
        state: state({ lat: 52.5, lng: -40 }),
        enrichment: enrichment(ROUTE),
      }),
    )

    expect(view.progress).toBeGreaterThan(40)
    expect(view.progress).toBeLessThan(60)
  })

  it('computes an eta from remaining distance and ground speed', () => {
    const view = toAircraftView(
      tracked({
        state: state({ lat: 41, lng: -73 }),
        enrichment: enrichment(ROUTE),
      }),
    )

    // A short hop left at 250 m/s should be well under an hour.
    expect(view.etaMinutes).toBeGreaterThan(0)
    expect(view.etaMinutes).toBeLessThan(60)
    expect(view.distanceRemainingKm).toBeLessThan(100)
  })

  it('gives no eta for a stationary or grounded aircraft', () => {
    const parked = toAircraftView(
      tracked({
        state: state({ onGround: true, velocity: 0 }),
        enrichment: enrichment(ROUTE),
      }),
    )

    expect(parked.etaMinutes).toBeNull()
    expect(parked.progress).not.toBeNull()
  })
})

describe('matchesQuery', () => {
  const view = toAircraftView(tracked({ enrichment: enrichment(ROUTE) }))

  it('matches everything for an empty query', () => {
    expect(matchesQuery(view, '')).toBe(true)
    expect(matchesQuery(view, '   ')).toBe(true)
  })

  it('matches on callsign, registration, airline and aircraft type', () => {
    expect(matchesQuery(view, 'baw1')).toBe(true)
    expect(matchesQuery(view, 'g-stba')).toBe(true)
    expect(matchesQuery(view, 'british')).toBe(true)
    expect(matchesQuery(view, '777')).toBe(true)
  })

  it('matches on either end of the route by code or city', () => {
    expect(matchesQuery(view, 'LHR')).toBe(true)
    expect(matchesQuery(view, 'kjfk')).toBe(true)
    expect(matchesQuery(view, 'new york')).toBe(true)
  })

  it('matches on the Mode-S address', () => {
    expect(matchesQuery(view, '4008f2')).toBe(true)
  })

  it('rejects terms that appear nowhere', () => {
    expect(matchesQuery(view, 'ryanair')).toBe(false)
  })

  it('still works before enrichment lands', () => {
    const bare = toAircraftView(tracked())

    expect(matchesQuery(bare, 'baw117')).toBe(true)
    expect(matchesQuery(bare, 'united kingdom')).toBe(true)
    expect(matchesQuery(bare, 'british airways')).toBe(false)
  })
})

describe('hoverLabel', () => {
  it('prefers the tail number when enrichment has resolved it', () => {
    expect(hoverLabel(tracked({ enrichment: enrichment(ROUTE) }))).toBe('G-STBA')
  })

  it('falls back to callsign, then the Mode-S address', () => {
    expect(hoverLabel(tracked())).toBe('BAW117')
    expect(hoverLabel(tracked({ state: state({ callsign: null }) }))).toBe('4008F2')
  })
})
