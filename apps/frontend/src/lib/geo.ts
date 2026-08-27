import {
  normaliseHeading,
  normaliseLongitude,
  toDegrees,
  toRadians,
  type LatLng,
} from '@skytrace/shared'

// The geodesy itself lives in the shared package so the server's replay source projects
// motion exactly the way the client interpolator does.
export {
  EARTH_RADIUS_M,
  destinationPoint,
  haversineMetres,
  initialBearing,
  normaliseHeading,
  normaliseLongitude,
  toDegrees,
  toRadians,
  type LatLng,
} from '@skytrace/shared'

/** Interpolates between two angles the short way round. */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180
  return normaliseHeading(from + delta * t)
}

/** Interpolates longitudes the short way round, so paths do not sweep across the map. */
export function lerpLongitude(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180
  return normaliseLongitude(from + delta * t)
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * Samples the great circle between two points.
 *
 * Long-haul routes drawn as straight lines on a Mercator projection are visibly wrong —
 * a London to Los Angeles flight really does arc over Greenland.
 */
export function greatCirclePath(a: LatLng, b: LatLng, segments = 64): LatLng[] {
  const lat1 = toRadians(a.lat)
  const lng1 = toRadians(a.lng)
  const lat2 = toRadians(b.lat)
  const lng2 = toRadians(b.lng)

  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const angular = 2 * Math.asin(Math.min(1, Math.sqrt(h)))

  // Coincident or antipodal endpoints have no unique arc; fall back to the endpoints.
  if (angular === 0 || !Number.isFinite(angular)) return [a, b]

  const sinAngular = Math.sin(angular)
  const points: LatLng[] = []

  for (let i = 0; i <= segments; i++) {
    const f = i / segments
    const aCoef = Math.sin((1 - f) * angular) / sinAngular
    const bCoef = Math.sin(f * angular) / sinAngular

    const x = aCoef * Math.cos(lat1) * Math.cos(lng1) + bCoef * Math.cos(lat2) * Math.cos(lng2)
    const y = aCoef * Math.cos(lat1) * Math.sin(lng1) + bCoef * Math.cos(lat2) * Math.sin(lng2)
    const z = aCoef * Math.sin(lat1) + bCoef * Math.sin(lat2)

    points.push({
      lat: toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
      lng: toDegrees(Math.atan2(y, x)),
    })
  }

  return points
}
