import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AircraftInfo, Airport, FlightRoute } from '@skytrace/shared';
import { AircraftEntity } from './entities/aircraft.entity';
import { AirportEntity } from './entities/airport.entity';
import { FlightRouteEntity } from './entities/flight-route.entity';
import {
  EnrichmentStore,
  type CachedAircraft,
  type CachedRoute,
} from './enrichment.store';

@Injectable()
export class TypeOrmEnrichmentStore extends EnrichmentStore {
  constructor(
    @InjectRepository(AircraftEntity)
    private readonly aircraftRepo: Repository<AircraftEntity>,
    @InjectRepository(FlightRouteEntity)
    private readonly routeRepo: Repository<FlightRouteEntity>,
    @InjectRepository(AirportEntity)
    private readonly airportRepo: Repository<AirportEntity>,
  ) {
    super();
  }

  async getAircraft(icao24: string): Promise<CachedAircraft | null> {
    const row = await this.aircraftRepo.findOne({ where: { icao24 } });
    if (!row) return null;

    return {
      fetchedAtMs: Number(row.fetchedAt),
      info: row.found
        ? {
            icao24: row.icao24,
            registration: row.registration,
            type: row.type,
            icaoType: row.icaoType,
            manufacturer: row.manufacturer,
            registeredOwner: row.registeredOwner,
            ownerCountryName: row.ownerCountryName,
            ownerCountryIso: row.ownerCountryIso,
            photoUrl: row.photoUrl,
            photoThumbnailUrl: row.photoThumbnailUrl,
          }
        : null,
    };
  }

  async putAircraft(icao24: string, info: AircraftInfo | null): Promise<void> {
    await this.aircraftRepo.upsert(
      {
        icao24,
        found: info !== null,
        registration: info?.registration ?? null,
        type: info?.type ?? null,
        icaoType: info?.icaoType ?? null,
        manufacturer: info?.manufacturer ?? null,
        registeredOwner: info?.registeredOwner ?? null,
        ownerCountryName: info?.ownerCountryName ?? null,
        ownerCountryIso: info?.ownerCountryIso ?? null,
        photoUrl: info?.photoUrl ?? null,
        photoThumbnailUrl: info?.photoThumbnailUrl ?? null,
        fetchedAt: String(Date.now()),
      },
      ['icao24'],
    );
  }

  async getRoute(callsign: string): Promise<CachedRoute | null> {
    const row = await this.routeRepo.findOne({ where: { callsign } });
    if (!row) return null;

    const fetchedAtMs = Number(row.fetchedAt);
    if (!row.found || !row.originIcao || !row.destinationIcao) {
      return { route: null, fetchedAtMs };
    }

    const icaos = [row.originIcao, row.midpointIcao, row.destinationIcao].filter(
      (value): value is string => Boolean(value),
    );
    const airports = await this.airportRepo.find({ where: { icao: In(icaos) } });
    const byIcao = new Map(airports.map((airport) => [airport.icao, toAirport(airport)]));

    const origin = byIcao.get(row.originIcao);
    const destination = byIcao.get(row.destinationIcao);

    // A route row without its airports is unusable; treat it as absent so it re-resolves.
    if (!origin || !destination) return null;

    return {
      fetchedAtMs,
      route: {
        callsign: row.callsign,
        callsignIcao: row.callsignIcao,
        callsignIata: row.callsignIata,
        airline: row.airlineName
          ? {
              name: row.airlineName,
              icao: row.airlineIcao,
              iata: row.airlineIata,
              country: row.airlineCountry,
              radioCallsign: row.airlineRadioCallsign,
            }
          : null,
        origin,
        midpoint: row.midpointIcao ? (byIcao.get(row.midpointIcao) ?? null) : null,
        destination,
      },
    };
  }

  async putRoute(callsign: string, route: FlightRoute | null): Promise<void> {
    if (route) {
      const airports = [route.origin, route.midpoint, route.destination].filter(
        (airport): airport is Airport => Boolean(airport),
      );
      if (airports.length > 0) {
        await this.airportRepo.upsert(
          airports.map((airport) => ({
            icao: airport.icao,
            iata: airport.iata,
            name: airport.name,
            municipality: airport.municipality,
            countryName: airport.countryName,
            countryIso: airport.countryIso,
            lat: airport.lat,
            lng: airport.lng,
            elevation: airport.elevation,
          })),
          ['icao'],
        );
      }
    }

    await this.routeRepo.upsert(
      {
        callsign,
        found: route !== null,
        callsignIcao: route?.callsignIcao ?? null,
        callsignIata: route?.callsignIata ?? null,
        airlineName: route?.airline?.name ?? null,
        airlineIcao: route?.airline?.icao ?? null,
        airlineIata: route?.airline?.iata ?? null,
        airlineCountry: route?.airline?.country ?? null,
        airlineRadioCallsign: route?.airline?.radioCallsign ?? null,
        originIcao: route?.origin.icao ?? null,
        midpointIcao: route?.midpoint?.icao ?? null,
        destinationIcao: route?.destination.icao ?? null,
        fetchedAt: String(Date.now()),
      },
      ['callsign'],
    );
  }
}

function toAirport(row: AirportEntity): Airport {
  return {
    icao: row.icao,
    iata: row.iata,
    name: row.name,
    municipality: row.municipality,
    countryName: row.countryName,
    countryIso: row.countryIso,
    lat: row.lat,
    lng: row.lng,
    elevation: row.elevation,
  };
}
