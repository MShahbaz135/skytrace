import { Link } from 'react-router-dom'
import {
  Gauge,
  Mountain,
  Navigation,
  TrendingUp,
  X,
  ExternalLink,
  Plane,
} from 'lucide-react'
import type { AircraftView } from '@/lib/aircraft-view'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { RouteProgress } from '@/components/flights/RouteProgress'
import {
  NO_DATA,
  formatAltitude,
  formatSpeed,
  formatVerticalRate,
} from '@/lib/utils'

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
        {unit && value !== NO_DATA && (
          <span className="ml-1 text-xs font-normal text-muted">{unit}</span>
        )}
      </p>
    </div>
  )
}

export function FlightDetailPanel({
  view,
  onClose,
}: {
  view: AircraftView
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/8 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink-700 text-accent">
            <Plane className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-mono text-lg font-bold text-white">{view.label}</h3>
              <StatusBadge phase={view.phase} />
            </div>
            {view.enriched ? (
              <p className="truncate text-sm text-muted">
                {view.airlineName ?? view.operator ?? view.originCountry}
              </p>
            ) : (
              <Skeleton className="mt-1 h-3.5 w-28" />
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {view.photoThumbnailUrl && (
          <img
            src={view.photoThumbnailUrl}
            alt={`${view.aircraftType ?? 'Aircraft'} ${view.registration ?? ''}`.trim()}
            loading="lazy"
            className="h-36 w-full rounded-xl border border-white/8 object-cover"
          />
        )}

        <RouteProgress view={view} />

        <div className="grid grid-cols-2 gap-2.5">
          <Telemetry
            icon={Mountain}
            label="Altitude"
            value={formatAltitude(view.altitudeFt)}
            unit="ft"
          />
          <Telemetry
            icon={Gauge}
            label="Ground speed"
            value={formatSpeed(view.speedKts)}
            unit="kts"
          />
          <Telemetry
            icon={Navigation}
            label="Track"
            value={view.heading !== null ? `${Math.round(view.heading)}°` : NO_DATA}
          />
          <Telemetry
            icon={TrendingUp}
            label="Vertical rate"
            value={formatVerticalRate(view.verticalRateFpm)}
            unit="ft/min"
          />
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Aircraft</h4>
          {view.enriched ? (
            <p className="mt-1 text-sm font-medium text-white">
              {view.aircraftType ?? 'Type not on record'}
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-32" />
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/8 pt-3 text-sm">
            <div>
              <p className="text-xs text-muted">Registration</p>
              {view.enriched ? (
                <p className="font-mono text-white">{view.registration ?? NO_DATA}</p>
              ) : (
                <Skeleton className="mt-1 h-4 w-16" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted">Mode-S</p>
              <p className="font-mono uppercase text-white">{view.icao24}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Operator</p>
              {view.enriched ? (
                <p className="truncate text-white">{view.operator ?? NO_DATA}</p>
              ) : (
                <Skeleton className="mt-1 h-4 w-20" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted">Registered in</p>
              <p className="truncate text-white">{view.originCountry}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 p-5">
        <Link
          to={`/flight/${view.icao24}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-4 py-3 text-sm font-semibold text-ink-950 transition-all hover:brightness-110"
        >
          View full flight details
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </div>
  )
}
