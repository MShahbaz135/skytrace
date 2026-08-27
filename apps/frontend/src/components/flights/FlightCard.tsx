import { ArrowRight, Plane } from 'lucide-react'
import type { AircraftView } from '@/lib/aircraft-view'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatAltitude, formatSpeed } from '@/lib/utils'

interface FlightCardProps {
  view: AircraftView
  active?: boolean
  onClick?: () => void
}

export function FlightCard({ view, active, onClick }: FlightCardProps) {
  const route = view.route

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-2xl border p-4 text-left transition-all duration-200',
        active
          ? 'border-accent/50 bg-accent/5 shadow-lg shadow-accent/10'
          : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-accent">
            <Plane className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-white">{view.label}</p>
            {view.enriched ? (
              <p className="truncate text-xs text-muted">
                {view.airlineName ?? view.operator ?? view.originCountry}
              </p>
            ) : (
              <Skeleton className="mt-1 h-3 w-24" />
            )}
          </div>
        </div>
        <StatusBadge phase={view.phase} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {route ? (
          <>
            <div className="text-center">
              <p className="font-mono text-base font-bold text-white">
                {route.origin.iata ?? route.origin.icao}
              </p>
              <p className="max-w-20 truncate text-[11px] text-muted">
                {route.origin.municipality ?? route.origin.countryIso}
              </p>
            </div>

            <div className="flex flex-1 items-center px-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-500" />
              <ArrowRight className="mx-1 size-3.5 text-muted-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-500" />
            </div>

            <div className="text-center">
              <p className="font-mono text-base font-bold text-white">
                {route.destination.iata ?? route.destination.icao}
              </p>
              <p className="max-w-20 truncate text-[11px] text-muted">
                {route.destination.municipality ?? route.destination.countryIso}
              </p>
            </div>
          </>
        ) : view.enriched ? (
          // adsbdb resolves routes from published schedules, so unscheduled traffic
          // legitimately has none. Fall back to telemetry rather than inventing one.
          <div className="flex w-full items-center justify-between text-xs text-muted">
            <span>{view.aircraftType ?? 'Route not published'}</span>
            <span className="font-mono">
              {formatAltitude(view.altitudeFt)} ft · {formatSpeed(view.speedKts)} kts
            </span>
          </div>
        ) : (
          <Skeleton className="h-4 w-full" />
        )}
      </div>
    </button>
  )
}
