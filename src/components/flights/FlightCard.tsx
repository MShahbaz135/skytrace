import { ArrowRight } from 'lucide-react'
import type { Flight } from '@/data/flights'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface FlightCardProps {
  flight: Flight
  active?: boolean
  onClick?: () => void
}

export function FlightCard({ flight, active, onClick }: FlightCardProps) {
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
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-ink-700 text-lg">
            {flight.airlineLogo}
          </span>
          <div>
            <p className="font-mono text-sm font-semibold text-white">{flight.flightNumber}</p>
            <p className="text-xs text-muted">{flight.airline}</p>
          </div>
        </div>
        <StatusBadge status={flight.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <p className="font-mono text-base font-bold text-white">{flight.origin.iata}</p>
          <p className="text-[11px] text-muted">{flight.departureTime}</p>
        </div>

        <div className="flex flex-1 items-center px-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-500" />
          <ArrowRight className="mx-1 size-3.5 text-muted-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-500" />
        </div>

        <div className="text-center">
          <p className="font-mono text-base font-bold text-white">{flight.destination.iata}</p>
          <p className="text-[11px] text-muted">{flight.arrivalTime}</p>
        </div>
      </div>
    </button>
  )
}
