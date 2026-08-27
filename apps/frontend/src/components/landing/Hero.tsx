import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radar, Play, Plane } from 'lucide-react'
import type { AircraftView } from '@/lib/aircraft-view'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { RouteProgress } from '@/components/flights/RouteProgress'
import { formatAltitude, formatNumber, formatSpeed } from '@/lib/utils'

const ARCS = [
  'M-50 320 Q 360 80 760 260',
  'M-50 120 Q 420 360 820 160',
  'M120 420 Q 500 120 900 340',
]

function FeaturedCard({ featured }: { featured: AircraftView | null }) {
  return (
    <div className="glass-strong rounded-3xl p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-accent">
            <Plane className="size-4.5" />
          </span>
          <div className="min-w-0">
            {featured ? (
              <>
                <p className="truncate font-mono text-sm font-semibold text-white">
                  {featured.label}
                </p>
                <p className="truncate text-xs text-muted">
                  {featured.airlineName ?? featured.originCountry}
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1.5 h-3 w-28" />
              </>
            )}
          </div>
        </div>
        {featured && <StatusBadge phase={featured.phase} />}
      </div>

      <div className="my-5 grid place-items-center">
        <div className="relative grid size-28 place-items-center">
          <span className="absolute inset-0 rounded-full border border-sky-glow/30" />
          <span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent"
            style={{ animation: 'spin 4s linear infinite' }}
          />
          <Plane
            className="size-9 text-accent drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"
            style={{ transform: `rotate(${featured?.heading ?? -45}deg)` }}
          />
        </div>
      </div>

      {featured ? (
        <RouteProgress view={featured} />
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-px w-full" />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Altitude</p>
          <p className="font-mono text-base font-semibold text-white">
            {featured ? `${formatAltitude(featured.altitudeFt)} ft` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted">Ground speed</p>
          <p className="font-mono text-base font-semibold text-white">
            {featured ? `${formatSpeed(featured.speedKts)} kts` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function Hero({
  featured,
  aircraftCount,
}: {
  featured: AircraftView | null
  aircraftCount: number
}) {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-sky-glow/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 size-[420px] rounded-full bg-accent/10 blur-[120px]" />

      <svg
        className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-[480px] w-full max-w-5xl opacity-40"
        viewBox="0 0 850 480"
        fill="none"
      >
        {ARCS.map((d, i) => (
          <g key={i}>
            <path d={d} stroke="url(#arc)" strokeWidth="1.5" strokeDasharray="4 8" opacity={0.4} />
            <path
              d={d}
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="40 1000"
              style={{ animation: `dash ${10 + i * 4}s linear infinite` }}
            />
          </g>
        ))}
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7dd3fc" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sky-soft"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-glow opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-sky-glow" />
            </span>
            {aircraftCount > 0
              ? `${formatNumber(aircraftCount)} aircraft being tracked right now`
              : 'Connecting to the live ADS-B feed…'}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Track every flight,
            <br />
            <span className="text-gradient">live across the sky.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-muted"
          >
            Real aircraft positions from the OpenSky Network, streamed to your browser and
            rendered on an interactive map with live altitude, speed and routes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/live"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-6 py-3.5 text-sm font-semibold text-ink-950 shadow-xl shadow-sky-glow/25 transition-all hover:brightness-110"
            >
              <Radar className="size-4.5" />
              Open Live Map
            </Link>
            <a
              href="#coverage"
              className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Play className="size-4 fill-current" />
              See it in action
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div style={{ animation: 'float-slow 6s ease-in-out infinite' }}>
            <FeaturedCard featured={featured} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
