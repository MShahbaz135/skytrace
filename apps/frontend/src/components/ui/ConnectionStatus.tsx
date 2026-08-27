import type { StatusPayload } from '@skytrace/shared'
import { cn, formatAge, formatNumber } from '@/lib/utils'

interface Descriptor {
  label: string
  dot: string
  text: string
}

function describe(connected: boolean, status: StatusPayload | null): Descriptor {
  if (!connected) return { label: 'Reconnecting', dot: 'bg-amber-400', text: 'text-amber-400' }

  switch (status?.source) {
    case 'live':
      return { label: 'Live', dot: 'bg-signal', text: 'text-signal' }
    case 'replay':
      return { label: 'Demo data', dot: 'bg-amber-400', text: 'text-amber-400' }
    case 'unavailable':
      return { label: 'Feed unavailable', dot: 'bg-rose-400', text: 'text-rose-400' }
    default:
      return { label: 'Connecting', dot: 'bg-sky-soft', text: 'text-sky-soft' }
  }
}

/**
 * Makes the state of the upstream feed visible rather than implicit.
 *
 * A tracker that silently shows stale positions is worse than one that admits the feed is
 * behind, so the age of the last poll is always on screen.
 */
export function ConnectionStatus({
  connected,
  status,
  className,
}: {
  connected: boolean
  status: StatusPayload | null
  className?: string
}) {
  const descriptor = describe(connected, status)

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl glass px-3 py-2 text-xs',
        className,
      )}
    >
      <span className="relative flex size-2">
        {connected && (
          <span
            className={cn('absolute inline-flex size-full rounded-full opacity-75', descriptor.dot)}
            style={{ animation: 'pulse-ring 1.8s ease-out infinite' }}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', descriptor.dot)} />
      </span>

      <span className={cn('font-medium', descriptor.text)}>{descriptor.label}</span>

      {status && (
        <>
          <span className="text-muted-dim">·</span>
          <span className="text-muted">{formatAge(status.lastPollAt)}</span>
          <span className="hidden text-muted-dim sm:inline">·</span>
          <span className="hidden text-muted sm:inline">
            every {Math.round(status.pollIntervalMs / 1000)}s
          </span>
          {status.creditsRemaining !== null && (
            <>
              <span className="hidden text-muted-dim md:inline">·</span>
              <span
                className="hidden text-muted md:inline"
                title="Remaining OpenSky API credits for today"
              >
                {formatNumber(status.creditsRemaining)} credits
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
