import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import type { Flight } from '@/data/flights'

const PLANE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`

function planeIcon(heading: number, active: boolean) {
  const size = active ? 38 : 30
  const color = active ? '#22d3ee' : '#7dd3fc'
  const glow = active
    ? 'filter: drop-shadow(0 0 8px rgba(34,211,238,0.9));'
    : 'filter: drop-shadow(0 0 4px rgba(125,211,252,0.5));'
  return L.divIcon({
    className: 'skytrace-plane',
    html: `<div style="width:${size}px;height:${size}px;color:${color};transform:rotate(${heading}deg);${glow};transition:color .2s">${PLANE_SVG}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function airportDot() {
  return L.divIcon({
    className: 'skytrace-airport',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,0.25);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

function FitBounds({ flight }: { flight: Flight | null }) {
  const map = useMap()
  useEffect(() => {
    if (!flight) return
    const bounds = L.latLngBounds([
      [flight.origin.lat, flight.origin.lng],
      [flight.destination.lat, flight.destination.lng],
      [flight.position.lat, flight.position.lng],
    ])
    map.flyToBounds(bounds, { padding: [80, 80], duration: 0.8, maxZoom: 6 })
  }, [flight, map])
  return null
}

interface FlightMapProps {
  flights: Flight[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}

export function FlightMap({ flights, selectedId, onSelect, className }: FlightMapProps) {
  const selected = useMemo(
    () => flights.find((f) => f.id === selectedId) ?? null,
    [flights, selectedId],
  )

  return (
    <div className={className}>
      <MapContainer
        center={[30, 10]}
        zoom={3}
        minZoom={2}
        scrollWheelZoom
        worldCopyJump
        zoomControl={false}
        className="size-full"
        style={{ background: '#0a0e1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {selected && (
          <>
            <Polyline
              positions={[
                [selected.origin.lat, selected.origin.lng],
                [selected.position.lat, selected.position.lng],
              ]}
              pathOptions={{ color: '#22d3ee', weight: 2.5, opacity: 0.9 }}
            />
            <Polyline
              positions={[
                [selected.position.lat, selected.position.lng],
                [selected.destination.lat, selected.destination.lng],
              ]}
              pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.35, dashArray: '6 8' }}
            />
            <Marker
              position={[selected.origin.lat, selected.origin.lng]}
              icon={airportDot()}
            />
            <Marker
              position={[selected.destination.lat, selected.destination.lng]}
              icon={airportDot()}
            />
            <CircleMarker
              center={[selected.position.lat, selected.position.lng]}
              radius={22}
              pathOptions={{ color: '#22d3ee', weight: 1, opacity: 0.4, fillOpacity: 0.06 }}
            />
          </>
        )}

        {flights.map((flight) => (
          <Marker
            key={flight.id}
            position={[flight.position.lat, flight.position.lng]}
            icon={planeIcon(flight.heading, flight.id === selectedId)}
            eventHandlers={{ click: () => onSelect(flight.id) }}
            zIndexOffset={flight.id === selectedId ? 1000 : 0}
          />
        ))}

        <FitBounds flight={selected} />
      </MapContainer>
    </div>
  )
}
