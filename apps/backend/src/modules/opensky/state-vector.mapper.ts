import type { AircraftState } from '@skytrace/shared';

/**
 * OpenSky returns each state vector as a positional array rather than an object.
 * Index meanings are fixed by the API contract; see the `/states/all` response schema.
 */
export type RawStateVector = [
  icao24: string,
  callsign: string | null,
  originCountry: string,
  timePosition: number | null,
  lastContact: number,
  longitude: number | null,
  latitude: number | null,
  baroAltitude: number | null,
  onGround: boolean,
  velocity: number | null,
  trueTrack: number | null,
  verticalRate: number | null,
  sensors: number[] | null,
  geoAltitude: number | null,
  squawk: string | null,
  spi: boolean,
  positionSource: number,
  category?: number,
];

export interface RawStatesResponse {
  time: number;
  states: RawStateVector[] | null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Returns null for vectors without a usable position — aircraft are regularly reported
 * with a known transponder but no fix, and those cannot be placed on a map.
 */
export function mapStateVector(raw: RawStateVector): AircraftState | null {
  const lat = finiteOrNull(raw[6]);
  const lng = finiteOrNull(raw[5]);
  if (lat === null || lng === null) return null;

  const icao24 = typeof raw[0] === 'string' ? raw[0].trim().toLowerCase() : '';
  if (!icao24) return null;

  const callsign = typeof raw[1] === 'string' ? raw[1].trim() : '';

  return {
    icao24,
    callsign: callsign.length > 0 ? callsign : null,
    originCountry: raw[2] ?? 'Unknown',
    lat,
    lng,
    baroAltitude: finiteOrNull(raw[7]),
    geoAltitude: finiteOrNull(raw[13]),
    velocity: finiteOrNull(raw[9]),
    trueTrack: finiteOrNull(raw[10]),
    verticalRate: finiteOrNull(raw[11]),
    onGround: Boolean(raw[8]),
    lastContact: finiteOrNull(raw[4]) ?? Math.floor(Date.now() / 1000),
    timePosition: finiteOrNull(raw[3]),
    squawk: typeof raw[14] === 'string' && raw[14].length > 0 ? raw[14] : null,
  };
}

export function mapStatesResponse(response: RawStatesResponse): AircraftState[] {
  if (!Array.isArray(response.states)) return [];
  const out: AircraftState[] = [];
  for (const raw of response.states) {
    const mapped = mapStateVector(raw);
    if (mapped) out.push(mapped);
  }
  return out;
}
