import type { FlightPhase } from '@skytrace/shared'
import { PHASE_META } from '@/lib/aircraft-view'
import { cn } from '@/lib/utils'

export function StatusBadge({
  phase,
  className,
}: {
  phase: FlightPhase
  className?: string
}) {
  const meta = PHASE_META[phase]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium',
        meta.color,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {phase !== 'on-ground' && (
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
