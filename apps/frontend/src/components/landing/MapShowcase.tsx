import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, MousePointerClick } from 'lucide-react'
import type { AircraftState } from '@skytrace/shared'
import type { LiveFeed } from '@/hooks/useLiveAircraft'
import type { AircraftView } from '@/lib/aircraft-view'
import { FlightMap } from '@/components/map/FlightMap'
import { FlightCard } from '@/components/flights/FlightCard'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'

export function MapShowcase({ feed, views }: { feed: LiveFeed; views: AircraftView[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const states = useMemo(() => {
    const map = new Map<string, AircraftState>()
    for (const [icao24, tracked] of feed.aircraft) map.set(icao24, tracked.state)
    return map
  }, [feed.aircraft])

  // A handful of aircraft with resolved routes make the best preview cards.
  const preview = useMemo(() => views.filter((view) => view.route).slice(0, 4), [views])

  const selectedTracked = selectedId ? (feed.aircraft.get(selectedId) ?? null) : null

  return (
    <section id="coverage" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Live map
            </span>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              The whole sky, on one screen
            </h2>
            <p className="mt-4 text-lg text-muted">
              Pan, zoom, and tap any aircraft to reveal its route and live telemetry. This map
              is the real thing — every plane on it is airborne right now.
            </p>
          </div>
          <Link
            to="/live"
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Open full map
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mt-12 grid gap-4 lg:grid-cols-[1fr_320px]"
        >
          <div className="relative h-[460px] overflow-hidden rounded-3xl border border-white/10">
            <FlightMap
              states={states}
              interpolator={feed.interpolator}
              selected={selectedTracked}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onViewportChange={feed.setViewport}
              className="size-full"
            />
            <div className="pointer-events-none absolute left-4 top-4 z-[400] flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted">
              <MousePointerClick className="size-3.5 text-accent" />
              Tap a plane to track it
            </div>
            <div className="pointer-events-none absolute right-4 top-4 z-[400]">
              <ConnectionStatus connected={feed.connected} status={feed.status} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {preview.length === 0 ? (
              <div className="grid h-full place-items-center rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center text-sm text-muted">
                Resolving aircraft and routes…
              </div>
            ) : (
              preview.map((view) => (
                <FlightCard
                  key={view.icao24}
                  view={view}
                  active={view.icao24 === selectedId}
                  onClick={() => setSelectedId(view.icao24)}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
