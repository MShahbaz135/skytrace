import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Gauge,
  Mountain,
  Navigation,
  TrendingUp,
  Plane,
  MapPin,
  Radio,
} from 'lucide-react'
import type { AircraftEnrichment, AircraftState } from '@skytrace/shared'
import { PositionInterpolator } from '@/lib/interpolation'
import { apiBaseUrl } from '@/lib/socket'
import { toAircraftView } from '@/lib/aircraft-view'
import { FlightMap } from '@/components/map/FlightMap'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { RouteProgress } from '@/components/flights/RouteProgress'
import {
  NO_DATA,
  formatAltitude,
  formatSpeed,
  formatVerticalRate,
} from '@/lib/utils'

interface AircraftDetail {
  state: AircraftState
  enrichment: AircraftEnrichment | null
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

/** Matches the server's poll cadence closely enough without adding load. */
const REFRESH_MS = 10_000

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Gauge
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-white">
        {value}
        {unit && value !== NO_DATA && (
          <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
        )}
      </p>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-4 pt-24">
      <div className="max-w-md text-center">
        <Plane className="mx-auto size-12 text-muted-dim" />
        <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
        <Link
          to="/live"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-5 py-3 text-sm font-semibold text-ink-950"
        >
          Back to live map
        </Link>
      </div>
    </div>
  )
}

export function FlightDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<AircraftDetail | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  const interpolatorRef = useRef<PositionInterpolator | null>(null)
  interpolatorRef.current ??= new PositionInterpolator()
  const interpolator = interpolatorRef.current

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/aircraft/${encodeURIComponent(id)}`)
        if (cancelled) return

        if (response.status === 404) {
          setLoadState('missing')
          return
        }
        if (!response.ok) {
          setLoadState('error')
          return
        }

        const payload = (await response.json()) as AircraftDetail
        if (cancelled) return

        setDetail(payload)
        interpolator.upsert(payload.state)
        setLoadState('ready')
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [id, interpolator])

  const states = useMemo(() => {
    const map = new Map<string, AircraftState>()
    if (detail) map.set(detail.state.icao24, detail.state)
    return map
  }, [detail])

  const view = useMemo(() => (detail ? toAircraftView(detail) : null), [detail])

  if (loadState === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-8 h-[420px] w-full rounded-3xl" />
      </div>
    )
  }

  if (loadState === 'missing') {
    return (
      <EmptyState
        title="Not currently tracked"
        body="SkyTrace only holds aircraft that are in the live feed right now. Open one from the live map to see its full detail."
      />
    )
  }

  if (loadState === 'error' || !view || !detail) {
    return (
      <EmptyState
        title="Could not reach the tracker"
        body="The live API did not respond. Check that the backend is running and try again."
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to="/live"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to live map
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-ink-700 text-accent">
            <Plane className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white">
                {view.label}
              </h1>
              <StatusBadge phase={view.phase} />
            </div>
            <p className="mt-0.5 text-muted">
              {[view.airlineName, view.aircraftType].filter(Boolean).join(' · ') ||
                view.originCountry}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">Mode-S address</p>
          <p className="font-mono text-xl font-semibold uppercase text-white">{view.icao24}</p>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="h-[420px] overflow-hidden rounded-3xl border border-white/10"
        >
          <FlightMap
            states={states}
            interpolator={interpolator}
            selected={detail}
            selectedId={view.icao24}
            onSelect={() => {}}
            center={[view.state.lat, view.state.lng]}
            zoom={6}
            className="size-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-6">
            <RouteProgress view={view} />
            {view.route && (
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/8 pt-5">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Departure</p>
                    <p className="text-sm font-medium text-white">{view.route.origin.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Arrival</p>
                    <p className="text-sm font-medium text-white">
                      {view.route.destination.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {view.photoUrl && (
            <img
              src={view.photoUrl}
              alt={`${view.aircraftType ?? 'Aircraft'} ${view.registration ?? ''}`.trim()}
              loading="lazy"
              className="h-48 w-full rounded-2xl border border-white/8 object-cover"
            />
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <Radio className="mt-0.5 size-5 shrink-0 text-sky-soft" />
            <p className="text-sm text-muted">
              Registration{' '}
              <span className="font-mono text-white">{view.registration ?? NO_DATA}</span>, squawk{' '}
              <span className="font-mono text-white">{view.state.squawk ?? NO_DATA}</span>,
              registered in <span className="text-white">{view.originCountry}</span>.
              {view.route && ' Route is the published schedule for this callsign.'}
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <StatTile
          icon={Mountain}
          label="Altitude"
          value={formatAltitude(view.altitudeFt)}
          unit="ft"
        />
        <StatTile
          icon={Gauge}
          label="Ground speed"
          value={formatSpeed(view.speedKts)}
          unit="kts"
        />
        <StatTile
          icon={Navigation}
          label="Track"
          value={view.heading !== null ? `${Math.round(view.heading)}°` : NO_DATA}
        />
        <StatTile
          icon={TrendingUp}
          label="Vertical rate"
          value={formatVerticalRate(view.verticalRateFpm)}
          unit="ft/min"
        />
      </motion.div>
    </div>
  )
}
