import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, MousePointerClick } from 'lucide-react'
import { FLIGHTS } from '@/data/flights'
import { FlightMap } from '@/components/map/FlightMap'
import { FlightCard } from '@/components/flights/FlightCard'

export function MapShowcase() {
  const [selectedId, setSelectedId] = useState<string | null>(FLIGHTS[0].id)
  const preview = FLIGHTS.slice(0, 4)

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
              Pan, zoom, and tap any aircraft to reveal its route and live telemetry. Try it right
              here.
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
              flights={FLIGHTS}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="size-full"
            />
            <div className="pointer-events-none absolute left-4 top-4 z-[400] flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted">
              <MousePointerClick className="size-3.5 text-accent" />
              Tap a plane to track it
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {preview.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                active={flight.id === selectedId}
                onClick={() => setSelectedId(flight.id)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
