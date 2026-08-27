import { Plane } from 'lucide-react'
import type { AircraftView } from '@/lib/aircraft-view'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDistance, formatDuration, formatEtaClock } from '@/lib/utils'

export function RouteProgress({
  view,
  className,
}: {
  view: AircraftView
  className?: string
}) {
  if (!view.enriched) {
    return (
      <div className={cn('w-full space-y-3', className)}>
        <div className="flex items-end justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-px w-full" />
      </div>
    )
  }

  const route = view.route
  if (!route) {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted',
          className,
        )}
      >
        No published route for this callsign. Positions and telemetry below are live.
      </div>
    )
  }

  const progress = view.progress ?? 0

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-semibold text-white">
            {route.origin.iata ?? route.origin.icao}
          </p>
          <p className="truncate text-xs text-muted">
            {route.origin.municipality ?? route.origin.name}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="font-mono text-lg font-semibold text-white">
            {route.destination.iata ?? route.destination.icao}
          </p>
          <p className="truncate text-xs text-muted">
            {route.destination.municipality ?? route.destination.name}
          </p>
        </div>
      </div>

      <div className="relative mt-3 h-px bg-ink-600">
        <div
          className="absolute inset-y-0 left-0 h-px bg-gradient-to-r from-sky-soft to-accent"
          style={{ width: `${progress}%` }}
        />
        <span className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
        <span className="absolute right-0 top-1/2 size-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-500 bg-ink-800" />
        <span
          className="absolute top-1/2 text-accent transition-all"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        >
          <Plane className="size-3.5 rotate-90 fill-current drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
        </span>
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span className="font-mono">{formatDistance(view.distanceFlownKm)} flown</span>
        <span className="text-muted-dim">{Math.round(progress)}%</span>
        <span className="font-mono">{formatDistance(view.distanceRemainingKm)} to go</span>
      </div>

      {view.etaMinutes !== null && (
        <p className="mt-2 text-center text-xs text-muted">
          Arriving in{' '}
          <span className="font-mono text-white">{formatDuration(view.etaMinutes)}</span> at
          current ground speed, around{' '}
          <span className="font-mono text-white">{formatEtaClock(view.etaMinutes)}</span>
        </p>
      )}
    </div>
  )
}
