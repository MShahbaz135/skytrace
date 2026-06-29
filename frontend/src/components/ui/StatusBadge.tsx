import { STATUS_META, type FlightStatus } from '@/data/flights'
import { cn } from '@/lib/utils'

export function StatusBadge({
  status,
  className,
}: {
  status: FlightStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium',
        meta.color,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {status === 'en-route' && (
          <span
            className={cn('absolute inline-flex size-full rounded-full opacity-75', meta.dot)}
            style={{ animation: 'pulse-ring 1.6s ease-out infinite' }}
          />
        )}
        <span className={cn('relative inline-flex size-1.5 rounded-full', meta.dot)} />
      </span>
      {meta.label}
    </span>
  )
}
