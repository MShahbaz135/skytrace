import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Gauge,
  Mountain,
  Navigation,
  Timer,
  Plane,
  MapPin,
  CalendarClock,
} from 'lucide-react'
import { getFlightById } from '@/data/flights'
import { FlightMap } from '@/components/map/FlightMap'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RouteProgress } from '@/components/flights/RouteProgress'
import { formatDuration, formatNumber } from '@/lib/utils'

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
        {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </p>
    </div>
  )
}

export function FlightDetailPage() {
  const { id } = useParams<{ id: string }>()
  const flight = id ? getFlightById(id) : undefined

  if (!flight) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-4 pt-24">
        <div className="text-center">
          <Plane className="mx-auto size-12 text-muted-dim" />
          <h1 className="mt-4 text-2xl font-bold text-white">Flight not found</h1>
          <p className="mt-2 text-muted">We couldn't find a flight with that ID.</p>
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
          <span className="grid size-14 place-items-center rounded-2xl bg-ink-700 text-3xl">
            {flight.airlineLogo}
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white">
                {flight.flightNumber}
              </h1>
              <StatusBadge status={flight.status} />
            </div>
            <p className="mt-0.5 text-muted">
              {flight.airline} · {flight.aircraft}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">Callsign</p>
          <p className="font-mono text-xl font-semibold text-white">{flight.callsign}</p>
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
            flights={[flight]}
            selectedId={flight.id}
            onSelect={() => {}}
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
            <RouteProgress flight={flight} />
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/8 pt-5">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-signal" />
                <div>
                  <p className="text-xs text-muted">Departure</p>
                  <p className="text-sm font-medium text-white">{flight.origin.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-accent" />
                <div>
                  <p className="text-xs text-muted">Arrival</p>
                  <p className="text-sm font-medium text-white">{flight.destination.name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <CalendarClock className="size-5 text-sky-soft" />
            <p className="text-sm text-muted">
              Scheduled <span className="font-mono text-white">{flight.departureTime}</span> →{' '}
              <span className="font-mono text-white">{flight.arrivalTime}</span>
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
        <StatTile icon={Mountain} label="Altitude" value={formatNumber(flight.altitude)} unit="ft" />
        <StatTile icon={Gauge} label="Ground speed" value={formatNumber(flight.speed)} unit="kts" />
        <StatTile icon={Navigation} label="Heading" value={`${Math.round(flight.heading)}°`} />
        <StatTile icon={Timer} label="Duration" value={formatDuration(flight.durationMin)} />
      </motion.div>
    </div>
  )
}
