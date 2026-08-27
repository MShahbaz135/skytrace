import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Airport, Airline, AircraftInfo, FlightRoute } from '@skytrace/shared';
import { CONFIG_TOKEN, type AppConfig } from '../../config/configuration';
import type {
  AdsbdbAircraft,
  AdsbdbAirline,
  AdsbdbAirport,
  AdsbdbCombinedResponse,
  AdsbdbFlightroute,
} from './adsbdb.types';

export interface LookupResult {
  aircraft: AircraftInfo | null;
  route: FlightRoute | null;
  /** True when adsbdb answered but had no record, so the miss can be cached. */
  definitiveMiss: boolean;
}

export class AdsbdbRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`adsbdb rate limited, retry in ${retryAfterSeconds}s`);
    this.name = 'AdsbdbRateLimitError';
  }
}

/**
 * Resolves a Mode-S address and callsign into airframe and route detail.
 *
 * adsbdb is free, keyless, and volunteer-run, so every failure here is treated as
 * non-fatal: the position stream must keep flowing whether or not enrichment succeeds.
 */
@Injectable()
export class AdsbdbClient {
  private readonly logger = new Logger(AdsbdbClient.name);

  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  async lookup(icao24: string, callsign: string | null): Promise<LookupResult> {
    const url = new URL(`${this.config.adsbdb.baseUrl}/aircraft/${encodeURIComponent(icao24)}`);
    if (callsign) url.searchParams.set('callsign', callsign);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.config.adsbdb.requestTimeoutMs),
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
      throw new AdsbdbRateLimitError(Number.isFinite(retryAfter) ? retryAfter : 60);
    }

    // adsbdb answers 404 for addresses it has never seen. That is a real answer, not an
    // outage, so the caller may cache it and stop asking.
    if (response.status === 404) {
      return { aircraft: null, route: null, definitiveMiss: true };
    }

    if (!response.ok) {
      throw new Error(`adsbdb lookup failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as AdsbdbCombinedResponse;
    const aircraft = payload.response?.aircraft
      ? mapAircraft(icao24, payload.response.aircraft)
      : null;
    const route = payload.response?.flightroute
      ? mapRoute(payload.response.flightroute)
      : null;

    return { aircraft, route, definitiveMiss: aircraft === null && route === null };
  }
}

export function mapAirport(raw: AdsbdbAirport): Airport {
  return {
    icao: raw.icao_code,
    iata: raw.iata_code,
    name: raw.name,
    municipality: raw.municipality,
    countryName: raw.country_name,
    countryIso: raw.country_iso_name,
    lat: raw.latitude,
    lng: raw.longitude,
    elevation: raw.elevation,
  };
}

export function mapAirline(raw: AdsbdbAirline): Airline {
  return {
    name: raw.name,
    icao: raw.icao,
    iata: raw.iata,
    country: raw.country,
    radioCallsign: raw.callsign,
  };
}

export function mapAircraft(icao24: string, raw: AdsbdbAircraft): AircraftInfo {
  return {
    icao24,
    registration: raw.registration,
    type: raw.type,
    icaoType: raw.icao_type,
    manufacturer: raw.manufacturer,
    registeredOwner: raw.registered_owner,
    ownerCountryName: raw.registered_owner_country_name,
    ownerCountryIso: raw.registered_owner_country_iso_name,
    photoUrl: raw.url_photo,
    photoThumbnailUrl: raw.url_photo_thumbnail,
  };
}

export function mapRoute(raw: AdsbdbFlightroute): FlightRoute {
  return {
    callsign: raw.callsign,
    callsignIcao: raw.callsign_icao,
    callsignIata: raw.callsign_iata,
    airline: raw.airline ? mapAirline(raw.airline) : null,
    origin: mapAirport(raw.origin),
    midpoint: raw.midpoint ? mapAirport(raw.midpoint) : null,
    destination: mapAirport(raw.destination),
  };
}
