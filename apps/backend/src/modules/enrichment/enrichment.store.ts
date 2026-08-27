import type { AircraftInfo, FlightRoute } from '@skytrace/shared';

export interface CachedAircraft {
  /** Null records a confirmed miss rather than an absent entry. */
  info: AircraftInfo | null;
  fetchedAtMs: number;
}

export interface CachedRoute {
  route: FlightRoute | null;
  fetchedAtMs: number;
}

/**
 * Persistence boundary for enrichment results.
 *
 * Backed by PostgreSQL in normal operation and by plain maps when no database is
 * configured, so the stream can run standalone without losing enrichment entirely.
 */
export abstract class EnrichmentStore {
  abstract getAircraft(icao24: string): Promise<CachedAircraft | null>;
  abstract putAircraft(icao24: string, info: AircraftInfo | null): Promise<void>;
  abstract getRoute(callsign: string): Promise<CachedRoute | null>;
  abstract putRoute(callsign: string, route: FlightRoute | null): Promise<void>;
}
