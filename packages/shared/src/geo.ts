/** Mean Earth radius in metres (IUGG). */
export const EARTH_RADIUS_M = 6371008.8;

export interface LatLng {
  lat: number;
  lng: number;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Wraps any angle into [0, 360). */
export function normaliseHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Wraps a longitude into [-180, 180). */
export function normaliseLongitude(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** Great-circle distance in metres. */
export function haversineMetres(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing in degrees when travelling the great circle from `a` to `b`. */
export function initialBearing(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normaliseHeading(toDegrees(Math.atan2(y, x)));
}

/**
 * Point reached by travelling `distanceMetres` from `origin` along a constant bearing,
 * following the great circle rather than a flat-map straight line.
 *
 * Shared between the client interpolator and the server's replay source so both project
 * motion identically.
 */
export function destinationPoint(
  origin: LatLng,
  bearingDegrees: number,
  distanceMetres: number,
): LatLng {
  if (distanceMetres === 0) return { lat: origin.lat, lng: origin.lng };

  const angular = distanceMetres / EARTH_RADIUS_M;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const sinLat2 =
    Math.sin(lat1) * Math.cos(angular) +
    Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing);
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)));

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * sinLat2,
    );

  return { lat: toDegrees(lat2), lng: normaliseLongitude(toDegrees(lng2)) };
}

/** A WGS-84 bounding box. Matches OpenSky's lamin/lomin/lamax/lomax parameters. */
export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const WORLD_BBOX: Bbox = {
  south: -90,
  west: -180,
  north: 90,
  east: 180,
};

export function clampLatitude(lat: number): number {
  return Math.min(90, Math.max(-90, lat));
}

export function clampLongitude(lng: number): number {
  return Math.min(180, Math.max(-180, lng));
}

export function normaliseBbox(bbox: Bbox): Bbox {
  const south = clampLatitude(Math.min(bbox.south, bbox.north));
  const north = clampLatitude(Math.max(bbox.south, bbox.north));
  const west = clampLongitude(Math.min(bbox.west, bbox.east));
  const east = clampLongitude(Math.max(bbox.west, bbox.east));
  return { south, west, north, east };
}

/** Area in square degrees, the unit OpenSky prices `/states/all` requests in. */
export function bboxAreaSqDeg(bbox: Bbox): number {
  const { south, west, north, east } = normaliseBbox(bbox);
  return (north - south) * (east - west);
}

/**
 * Credit cost of a `/states/all` request, per the OpenSky pricing table.
 * A full daily allowance for a standard account is 4,000 credits.
 */
export function bboxCreditCost(bbox: Bbox): 1 | 2 | 3 | 4 {
  const area = bboxAreaSqDeg(bbox);
  if (area <= 25) return 1;
  if (area <= 100) return 2;
  if (area <= 400) return 3;
  return 4;
}

export function bboxContains(bbox: Bbox, lat: number, lng: number): boolean {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

/** Smallest box enclosing both inputs. */
export function bboxUnion(a: Bbox, b: Bbox): Bbox {
  return normaliseBbox({
    south: Math.min(a.south, b.south),
    west: Math.min(a.west, b.west),
    north: Math.max(a.north, b.north),
    east: Math.max(a.east, b.east),
  });
}

/** Grow a box by a margin in degrees, so small pans do not force an immediate refetch. */
export function bboxPad(bbox: Bbox, marginDeg: number): Bbox {
  return normaliseBbox({
    south: bbox.south - marginDeg,
    west: bbox.west - marginDeg,
    north: bbox.north + marginDeg,
    east: bbox.east + marginDeg,
  });
}

export function bboxEquals(a: Bbox, b: Bbox, epsilon = 1e-6): boolean {
  return (
    Math.abs(a.south - b.south) < epsilon &&
    Math.abs(a.west - b.west) < epsilon &&
    Math.abs(a.north - b.north) < epsilon &&
    Math.abs(a.east - b.east) < epsilon
  );
}
