import { Link } from 'react-router-dom'
import { Gauge, Mountain, Navigation, Timer, X, ExternalLink } from 'lucide-react'
import type { Flight } from '@/data/flights'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RouteProgress } from '@/components/flights/RouteProgress'
import { formatDuration, formatNumber } from '@/lib/utils'

function Telemetry({
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
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 font-mono text-lg font-semibold text-white">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  )
}

export function FlightDetailPanel({
  flight,
  onClose,
}: {
  flight: Flight
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/8 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink-700 text-2xl">
            {flight.airlineLogo}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-lg font-bold text-white">{flight.flightNumber}</h3>
              <StatusBadge status={flight.status} />
            </div>
            <p className="text-sm text-muted">{flight.airline}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <RouteProgress flight={flight} />

        <div className="grid grid-cols-2 gap-2.5">
          <Telemetry icon={Mountain} label="Altitude" value={formatNumber(flight.altitude)} unit="ft" />
          <Telemetry icon={Gauge} label="Speed" value={formatNumber(flight.speed)} unit="kts" />
          <Telemetry icon={Navigation} label="Heading" value={`${Math.round(flight.heading)}°`} />
          <Telemetry icon={Timer} label="Duration" value={formatDuration(flight.durationMin)} />
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Aircraft</h4>
          <p className="mt-1 text-sm font-medium text-white">{flight.aircraft}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/8 pt-3 text-sm">
            <div>
              <p className="text-xs text-muted">Callsign</p>
              <p className="font-mono text-white">{flight.callsign}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Registration</p>
              <p className="font-mono text-white">N{flight.id}X</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 p-5">
        <Link
          to={`/flight/${flight.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-4 py-3 text-sm font-semibold text-ink-950 transition-all hover:brightness-110"
        >
          View full flight details
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </div>
  )
}
