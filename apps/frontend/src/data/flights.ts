export type FlightStatus = 'en-route' | 'boarding' | 'landed' | 'delayed' | 'scheduled'

export interface Airport {
  iata: string
  city: string
  name: string
  lat: number
  lng: number
}

export interface Flight {
  id: string
  callsign: string
  flightNumber: string
  airline: string
  airlineLogo: string // single emoji / glyph used as a lightweight placeholder
  aircraft: string
  status: FlightStatus
  origin: Airport
  destination: Airport
  /** Current position on the map */
  position: { lat: number; lng: number }
  /** Heading in degrees, 0 = north */
  heading: number
  altitude: number // feet
  speed: number // knots
  progress: number // 0–100 %
  departureTime: string
  arrivalTime: string
  durationMin: number
}

export const AIRPORTS: Record<string, Airport> = {
  JFK: { iata: 'JFK', city: 'New York', name: 'John F. Kennedy Intl', lat: 40.6413, lng: -73.7781 },
  LHR: { iata: 'LHR', city: 'London', name: 'Heathrow', lat: 51.47, lng: -0.4543 },
  DXB: { iata: 'DXB', city: 'Dubai', name: 'Dubai Intl', lat: 25.2532, lng: 55.3657 },
  SIN: { iata: 'SIN', city: 'Singapore', name: 'Changi', lat: 1.3644, lng: 103.9915 },
  LAX: { iata: 'LAX', city: 'Los Angeles', name: 'Los Angeles Intl', lat: 33.9416, lng: -118.4085 },
  HND: { iata: 'HND', city: 'Tokyo', name: 'Haneda', lat: 35.5494, lng: 139.7798 },
  CDG: { iata: 'CDG', city: 'Paris', name: 'Charles de Gaulle', lat: 49.0097, lng: 2.5479 },
  SFO: { iata: 'SFO', city: 'San Francisco', name: 'San Francisco Intl', lat: 37.6213, lng: -122.379 },
  FRA: { iata: 'FRA', city: 'Frankfurt', name: 'Frankfurt am Main', lat: 50.0379, lng: 8.5622 },
  SYD: { iata: 'SYD', city: 'Sydney', name: 'Kingsford Smith', lat: -33.9399, lng: 151.1753 },
  IST: { iata: 'IST', city: 'Istanbul', name: 'Istanbul Airport', lat: 41.2753, lng: 28.7519 },
  GRU: { iata: 'GRU', city: 'São Paulo', name: 'Guarulhos', lat: -23.4356, lng: -46.4731 },
}

export const STATUS_META: Record<
  FlightStatus,
  { label: string; color: string; dot: string }
> = {
  'en-route': { label: 'En route', color: 'text-sky-soft', dot: 'bg-sky-glow' },
  boarding: { label: 'Boarding', color: 'text-amber', dot: 'bg-amber' },
  landed: { label: 'Landed', color: 'text-signal', dot: 'bg-signal' },
  delayed: { label: 'Delayed', color: 'text-alert', dot: 'bg-alert' },
  scheduled: { label: 'Scheduled', color: 'text-muted', dot: 'bg-muted' },
}

function midpoint(a: Airport, b: Airport, t: number) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  }
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

interface Seed {
  id: string
  callsign: string
  flightNumber: string
  airline: string
  airlineLogo: string
  aircraft: string
  status: FlightStatus
  from: keyof typeof AIRPORTS
  to: keyof typeof AIRPORTS
  progress: number
  altitude: number
  speed: number
  departureTime: string
  arrivalTime: string
  durationMin: number
}

const SEEDS: Seed[] = [
  { id: 'EK202', callsign: 'UAE202', flightNumber: 'EK 202', airline: 'Emirates', airlineLogo: '🇦🇪', aircraft: 'Airbus A380-800', status: 'en-route', from: 'DXB', to: 'JFK', progress: 62, altitude: 38000, speed: 514, departureTime: '08:30', arrivalTime: '14:05', durationMin: 815 },
  { id: 'BA178', callsign: 'BAW178', flightNumber: 'BA 178', airline: 'British Airways', airlineLogo: '🇬🇧', aircraft: 'Boeing 777-300ER', status: 'en-route', from: 'LHR', to: 'JFK', progress: 41, altitude: 36000, speed: 488, departureTime: '11:15', arrivalTime: '14:20', durationMin: 485 },
  { id: 'SQ322', callsign: 'SIA322', flightNumber: 'SQ 322', airline: 'Singapore Airlines', airlineLogo: '🇸🇬', aircraft: 'Airbus A350-900', status: 'en-route', from: 'SIN', to: 'LHR', progress: 78, altitude: 41000, speed: 521, departureTime: '23:55', arrivalTime: '06:30', durationMin: 815 },
  { id: 'UA837', callsign: 'UAL837', flightNumber: 'UA 837', airline: 'United', airlineLogo: '🇺🇸', aircraft: 'Boeing 787-9', status: 'en-route', from: 'SFO', to: 'HND', progress: 33, altitude: 37000, speed: 502, departureTime: '11:00', arrivalTime: '14:40', durationMin: 660 },
  { id: 'AF11', callsign: 'AFR011', flightNumber: 'AF 11', airline: 'Air France', airlineLogo: '🇫🇷', aircraft: 'Boeing 777-200ER', status: 'en-route', from: 'CDG', to: 'LAX', progress: 54, altitude: 39000, speed: 497, departureTime: '10:25', arrivalTime: '13:10', durationMin: 685 },
  { id: 'QF1', callsign: 'QFA001', flightNumber: 'QF 1', airline: 'Qantas', airlineLogo: '🇦🇺', aircraft: 'Airbus A380-800', status: 'en-route', from: 'SYD', to: 'SIN', progress: 88, altitude: 40000, speed: 509, departureTime: '16:00', arrivalTime: '21:15', durationMin: 495 },
  { id: 'LH400', callsign: 'DLH400', flightNumber: 'LH 400', airline: 'Lufthansa', airlineLogo: '🇩🇪', aircraft: 'Airbus A340-300', status: 'delayed', from: 'FRA', to: 'JFK', progress: 12, altitude: 34000, speed: 471, departureTime: '13:30', arrivalTime: '16:05', durationMin: 545 },
  { id: 'TK1', callsign: 'THY001', flightNumber: 'TK 1', airline: 'Turkish Airlines', airlineLogo: '🇹🇷', aircraft: 'Boeing 787-9', status: 'en-route', from: 'IST', to: 'GRU', progress: 27, altitude: 38000, speed: 505, departureTime: '14:50', arrivalTime: '23:40', durationMin: 770 },
  { id: 'EK29', callsign: 'UAE029', flightNumber: 'EK 29', airline: 'Emirates', airlineLogo: '🇦🇪', aircraft: 'Boeing 777-300ER', status: 'boarding', from: 'DXB', to: 'FRA', progress: 0, altitude: 0, speed: 0, departureTime: '15:40', arrivalTime: '20:05', durationMin: 385 },
  { id: 'JL44', callsign: 'JAL044', flightNumber: 'JL 44', airline: 'Japan Airlines', airlineLogo: '🇯🇵', aircraft: 'Boeing 787-8', status: 'en-route', from: 'HND', to: 'SIN', progress: 69, altitude: 37000, speed: 493, departureTime: '00:05', arrivalTime: '06:25', durationMin: 440 },
  { id: 'BA284', callsign: 'BAW284', flightNumber: 'BA 284', airline: 'British Airways', airlineLogo: '🇬🇧', aircraft: 'Airbus A350-1000', status: 'landed', from: 'SFO', to: 'LHR', progress: 100, altitude: 0, speed: 0, departureTime: '19:35', arrivalTime: '13:50', durationMin: 615 },
  { id: 'SQ12', callsign: 'SIA012', flightNumber: 'SQ 12', airline: 'Singapore Airlines', airlineLogo: '🇸🇬', aircraft: 'Airbus A350-900', status: 'scheduled', from: 'SIN', to: 'LAX', progress: 0, altitude: 0, speed: 0, departureTime: '18:20', arrivalTime: '18:55', durationMin: 1015 },
]

export const FLIGHTS: Flight[] = SEEDS.map((s) => {
  const origin = AIRPORTS[s.from]
  const destination = AIRPORTS[s.to]
  const position = midpoint(origin, destination, s.progress / 100)
  const heading = bearing(origin, destination)
  return {
    id: s.id,
    callsign: s.callsign,
    flightNumber: s.flightNumber,
    airline: s.airline,
    airlineLogo: s.airlineLogo,
    aircraft: s.aircraft,
    status: s.status,
    origin,
    destination,
    position,
    heading,
    altitude: s.altitude,
    speed: s.speed,
    progress: s.progress,
    departureTime: s.departureTime,
    arrivalTime: s.arrivalTime,
    durationMin: s.durationMin,
  }
})

export function getFlightById(id: string): Flight | undefined {
  return FLIGHTS.find((f) => f.id === id)
}

export const GLOBAL_STATS = {
  flightsTracked: 14238,
  airportsCovered: 9600,
  countries: 195,
  airlines: 1300,
}
