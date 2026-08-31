import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { normaliseBbox, type AircraftState, type Bbox } from '@skytrace/shared'
import type { TrackedAircraft } from '@/hooks/useLiveAircraft'
import { useVisitorRegion } from '@/hooks/useVisitorRegion'
import type { MapView } from '@/lib/visitor-region'
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

/**
 * Applies the visitor's country framing before the first paint of the viewport reporter,
 * so the opening OpenSky query is already the right box.
 */
function InitialCountryView({ view }: { view: MapView }) {
  const map = useMap()
  const applied = useRef(false)

  useLayoutEffect(() => {
    if (applied.current) return
    applied.current = true
    if (view.bounds) {
      map.fitBounds(view.bounds, { padding: [28, 28], maxZoom: 7, animate: false })
      return
    }
    map.setView(view.center, view.zoom, { animate: false })
  }, [map, view])

  return null
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
  const lastFitKey = useRef<string | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const icao24 = selected?.state.icao24 ?? null
  const originIcao = selected?.enrichment?.route?.origin.icao ?? null
  const destIcao = selected?.enrichment?.route?.destination.icao ?? null

  // A wheel or drag during flyToBounds should keep the user's camera, not finish the animation.
  useEffect(() => {
    const interrupt = () => map.stop()
    const container = map.getContainer()
    container.addEventListener('wheel', interrupt, { passive: true })
    container.addEventListener('touchstart', interrupt, { passive: true })
    map.on('dragstart', interrupt)
    return () => {
      container.removeEventListener('wheel', interrupt)
      container.removeEventListener('touchstart', interrupt)
      map.off('dragstart', interrupt)
    }
  }, [map])

  useEffect(() => {
    const current = selectedRef.current
    if (!icao24 || !current) {
      lastFitKey.current = null
      return
    }

    // Airport ICAOs, not the route object: enrichment is re-emitted on every viewport
    // snapshot with a new object identity, which would otherwise re-trigger flyToBounds
    // (maxZoom 6) and fight the user's zoom/pan.
    const key = `${icao24}:${originIcao ?? ''}:${destIcao ?? ''}`
    if (lastFitKey.current === key) return
    lastFitKey.current = key

    const points: L.LatLngExpression[] = [[current.state.lat, current.state.lng]]
    const route = current.enrichment?.route
    if (route) {
      points.push([route.origin.lat, route.origin.lng])
      points.push([route.destination.lat, route.destination.lng])
    }

    map.flyToBounds(L.latLngBounds(points), {
      padding: [80, 80],
      duration: 0.8,
      maxZoom: route ? 6 : 8,
    })
  }, [icao24, originIcao, destIcao, map])

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
  labels?: Map<string, string>
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
  labels,
  center,
  zoom,
  className,
}: FlightMapProps) {
  const visitor = useVisitorRegion()
  const view: MapView = {
    center: center ?? visitor.view.center,
    zoom: zoom ?? visitor.view.zoom,
    bounds: center ? undefined : visitor.view.bounds,
  }
  const ready = center !== undefined || visitor.ready

  if (!ready) {
    return <div className={className} style={{ background: '#0a0e1a' }} />
  }

  return (
    <div className={className}>
      <MapContainer
        center={view.center}
        zoom={view.zoom}
        minZoom={2}
        scrollWheelZoom
        worldCopyJump
        zoomControl={false}
        className="size-full"
        style={{ background: '#0a0e1a' }}
      >
        <InitialCountryView view={view} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selected && <SelectedRoute selected={selected} />}

        <AircraftCanvasLayer
          states={states}
          interpolator={interpolator}
          selectedId={selectedId}
          labels={labels}
          onSelect={onSelect}
        />

        {onViewportChange && <ViewportReporter onChange={onViewportChange} />}
        <FitToSelection selected={selected} />
      </MapContainer>
    </div>
  )
}
