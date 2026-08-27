/**
 * A live positional sample for one aircraft, derived from an OpenSky state vector.
 * Units are as broadcast: metres, metres per second, degrees.
 */
export interface AircraftState {
  /** Lower-case ICAO 24-bit Mode-S address. Stable per airframe, the join key for enrichment. */
  icao24: string;
  /** Trimmed callsign, null when the transponder has not broadcast one. */
  callsign: string | null;
  originCountry: string;
  lat: number;
  lng: number;
  /** Barometric altitude in metres. */
  baroAltitude: number | null;
  /** GNSS altitude in metres. */
  geoAltitude: number | null;
  /** Ground speed in metres per second. */
  velocity: number | null;
  /** Track angle in degrees clockwise from true north. */
  trueTrack: number | null;
  /** Metres per second; positive is climbing. */
  verticalRate: number | null;
  onGround: boolean;
  /** Unix seconds of the last message of any type from this aircraft. */
  lastContact: number;
  /** Unix seconds of the position report itself. */
  timePosition: number | null;
  squawk: string | null;
}

export interface Airport {
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  countryName: string | null;
  countryIso: string | null;
  lat: number;
  lng: number;
  /** Field elevation in feet. */
  elevation: number | null;
}

export interface Airline {
  name: string;
  icao: string | null;
  iata: string | null;
  country: string | null;
  /** Spoken radio callsign, e.g. "SPEEDBIRD". */
  radioCallsign: string | null;
}

export interface AircraftInfo {
  icao24: string;
  registration: string | null;
  /** Plain-language type, e.g. "Boeing 777-300ER". */
  type: string | null;
  /** ICAO type designator, e.g. "B77W". */
  icaoType: string | null;
  manufacturer: string | null;
  registeredOwner: string | null;
  ownerCountryName: string | null;
  ownerCountryIso: string | null;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
}

/**
 * The route normally flown under a given callsign.
 *
 * This is schedule-derived, not observed: adsbdb resolves callsigns against published
 * schedules, so treat it as the expected route rather than confirmed truth.
 */
export interface FlightRoute {
  callsign: string;
  callsignIcao: string | null;
  callsignIata: string | null;
  airline: Airline | null;
  origin: Airport;
  /** Set on the minority of routes that include a scheduled stop. */
  midpoint: Airport | null;
  destination: Airport;
}

/** Reference data resolved for one aircraft, delivered separately from its position stream. */
export interface AircraftEnrichment {
  icao24: string;
  /** Callsign the route was resolved against, null when only airframe data was found. */
  callsign: string | null;
  aircraft: AircraftInfo | null;
  route: FlightRoute | null;
}

/** Vertical phase, derived from on-ground state and vertical rate. */
export type FlightPhase = 'on-ground' | 'climbing' | 'cruising' | 'descending';

/** Metres per second of vertical rate beyond which an aircraft counts as climbing or descending. */
export const VERTICAL_RATE_THRESHOLD_MS = 1.5;

export function derivePhase(state: AircraftState): FlightPhase {
  if (state.onGround) return 'on-ground';
  const rate = state.verticalRate;
  if (rate !== null && rate > VERTICAL_RATE_THRESHOLD_MS) return 'climbing';
  if (rate !== null && rate < -VERTICAL_RATE_THRESHOLD_MS) return 'descending';
  return 'cruising';
}
