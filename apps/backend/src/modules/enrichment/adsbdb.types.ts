/** Raw shapes returned by api.adsbdb.com. Mapped into shared types before leaving this module. */

export interface AdsbdbAirport {
  country_iso_name: string | null;
  country_name: string | null;
  elevation: number | null;
  iata_code: string | null;
  icao_code: string;
  latitude: number;
  longitude: number;
  municipality: string | null;
  name: string;
}

export interface AdsbdbAirline {
  name: string;
  icao: string | null;
  iata: string | null;
  country: string | null;
  country_iso: string | null;
  callsign: string | null;
}

export interface AdsbdbAircraft {
  type: string | null;
  icao_type: string | null;
  manufacturer: string | null;
  mode_s: string;
  registration: string | null;
  registered_owner_country_iso_name: string | null;
  registered_owner_country_name: string | null;
  registered_owner_operator_flag_code: string | null;
  registered_owner: string | null;
  url_photo: string | null;
  url_photo_thumbnail: string | null;
}

export interface AdsbdbFlightroute {
  callsign: string;
  callsign_icao: string | null;
  callsign_iata: string | null;
  airline: AdsbdbAirline | null;
  origin: AdsbdbAirport;
  midpoint?: AdsbdbAirport | null;
  destination: AdsbdbAirport;
}

export interface AdsbdbCombinedResponse {
  response?: {
    aircraft?: AdsbdbAircraft;
    flightroute?: AdsbdbFlightroute;
  };
}
