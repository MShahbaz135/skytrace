import { Plane } from 'lucide-react'
import type { Flight } from '@/data/flights'
import { cn } from '@/lib/utils'

export function RouteProgress({ flight, className }: { flight: Flight; className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-lg font-semibold text-white">{flight.origin.iata}</p>
          <p className="text-xs text-muted">{flight.origin.city}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold text-white">{flight.destination.iata}</p>
          <p className="text-xs text-muted">{flight.destination.city}</p>
        </div>
      </div>

      <div className="relative mt-3 h-px bg-ink-600">
        <div
          className="absolute inset-y-0 left-0 h-px bg-gradient-to-r from-sky-soft to-accent"
          style={{ width: `${flight.progress}%` }}
        />
        <span className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
        <span className="absolute right-0 top-1/2 size-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-500 bg-ink-800" />
        <span
          className="absolute top-1/2 -translate-y-1/2 text-accent transition-all"
          style={{ left: `${flight.progress}%`, transform: 'translate(-50%, -50%)' }}
        >
          <Plane className="size-3.5 rotate-90 fill-current drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
        </span>
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span className="font-mono">{flight.departureTime}</span>
        <span className="text-muted-dim">{flight.progress}%</span>
        <span className="font-mono">{flight.arrivalTime}</span>
      </div>
    </div>
  )
}
