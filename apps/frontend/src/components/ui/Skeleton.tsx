import { cn } from '@/lib/utils'

/** Placeholder shown while adsbdb enrichment is still in flight for an aircraft. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block animate-pulse rounded bg-white/10 align-middle', className)}
    />
  )
}
