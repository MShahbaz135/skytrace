import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group flex items-center gap-2.5', className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-soft to-accent shadow-lg shadow-sky-glow/20 transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-5 text-ink-950" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Sky<span className="text-gradient">Trace</span>
      </span>
    </Link>
  )
}
