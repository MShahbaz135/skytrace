import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { normaliseBbox, type AircraftState, type Bbox } from '@skytrace/shared'
import type { TrackedAircraft } from '@/hooks/useLiveAircraft'
import type { PositionInterpolator } from '@/lib/interpolation'
import { greatCirclePath } from '@/lib/geo'
import { AircraftCanvasLayer } from './AircraftCanvasLayer'

function airportDot(colour: string) {
  return L.divIcon({
    className: 'skytrace-airport',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${colour};box-shadow:0 0 0 3px ${colour}40;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

/** Reports the visible area upward so the server can narrow its upstream query. */
function ViewportReporter({ onChange }: { onChange: (bbox: Bbox, zoom: number) => void }) {
  const map = useMap()

  const report = () => {
    const bounds = map.getBounds()
    onChange(
      normaliseBbox({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      }),
      map.getZoom(),
    )
  }

  useMapEvents({ moveend: report, zoomend: report })

  useEffect(() => {
    report()
    // Only on mount: subsequent changes arrive through the map events above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function FitToSelection({ selected }: { selected: TrackedAircraft | null }) {
  const map = useMap()
  const route = selected?.enrichment?.route ?? null
  const icao24 = selected?.state.icao24 ?? null

  useEffect(() => {
    if (!selected) return

    const points: L.LatLngExpression[] = [[selected.state.lat, selected.state.lng]]
    if (route) {
      points.push([route.origin.lat, route.origin.lng])
      points.push([route.destination.lat, route.destination.lng])
    }

    map.flyToBounds(L.latLngBounds(points), {
      padding: [80, 80],
      duration: 0.8,
      maxZoom: route ? 6 : 8,
    })
    // Re-running on every position update would fight the user's panning, so this keys
    // off the selected aircraft and whether its route is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icao24, route, map])

  return null
}

/** Draws the flown and remaining portions of a known route as true great-circle arcs. */
function SelectedRoute({ selected }: { selected: TrackedAircraft }) {
  const route = selected.enrichment?.route
  const position = { lat: selected.state.lat, lng: selected.state.lng }

  const flown = useMemo(
    () => (route ? greatCirclePath(route.origin, position, 48) : []),
    [route, position.lat, position.lng],
  )
  const remaining = useMemo(
    () => (route ? greatCirclePath(position, route.destination, 48) : []),
    [route, position.lat, position.lng],
  )

  return (
    <>
      {route && (
        <>
          <Polyline
            positions={flown.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#22d3ee', weight: 2.5, opacity: 0.9 }}
          />
          <Polyline
            positions={remaining.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.35, dashArray: '6 8' }}
          />
          <Marker
            position={[route.origin.lat, route.origin.lng]}
            icon={airportDot('#34d399')}
          />
          <Marker
            position={[route.destination.lat, route.destination.lng]}
            icon={airportDot('#22d3ee')}
          />
        </>
      )}

      <CircleMarker
        center={[position.lat, position.lng]}
        radius={22}
        pathOptions={{ color: '#22d3ee', weight: 1, opacity: 0.4, fillOpacity: 0.06 }}
      />
    </>
  )
}

export interface FlightMapProps {
  states: Map<string, AircraftState>
  interpolator: PositionInterpolator
  selected: TrackedAircraft | null
  selectedId: string | null
  onSelect: (icao24: string | null) => void
  onViewportChange?: (bbox: Bbox, zoom: number) => void
  center?: [number, number]
  zoom?: number
  className?: string
}

export function FlightMap({
  states,
  interpolator,
  selected,
  selectedId,
  onSelect,
  onViewportChange,
  center = [48, 8],
  zoom = 5,
  className,
}: FlightMapProps) {
  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={2}
        scrollWheelZoom
        worldCopyJump
        zoomControl={false}
        className="size-full"
        style={{ background: '#0a0e1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selected && <SelectedRoute selected={selected} />}

        <AircraftCanvasLayer
          states={states}
          interpolator={interpolator}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        {onViewportChange && <ViewportReporter onChange={onViewportChange} />}
        <FitToSelection selected={selected} />
      </MapContainer>
    </div>
  )
}
