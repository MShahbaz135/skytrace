import { Injectable } from '@nestjs/common';
import type { AircraftInfo, FlightRoute } from '@skytrace/shared';
import {
  EnrichmentStore,
  type CachedAircraft,
  type CachedRoute,
} from './enrichment.store';

/** Process-lifetime fallback used when DB_HOST is unset. */
@Injectable()
export class MemoryEnrichmentStore extends EnrichmentStore {
  private readonly aircraft = new Map<string, CachedAircraft>();
  private readonly routes = new Map<string, CachedRoute>();

  getAircraft(icao24: string): Promise<CachedAircraft | null> {
    return Promise.resolve(this.aircraft.get(icao24) ?? null);
  }

  putAircraft(icao24: string, info: AircraftInfo | null): Promise<void> {
    this.aircraft.set(icao24, { info, fetchedAtMs: Date.now() });
    return Promise.resolve();
  }

  getRoute(callsign: string): Promise<CachedRoute | null> {
    return Promise.resolve(this.routes.get(callsign) ?? null);
  }

  putRoute(callsign: string, route: FlightRoute | null): Promise<void> {
    this.routes.set(callsign, { route, fetchedAtMs: Date.now() });
    return Promise.resolve();
  }
}
