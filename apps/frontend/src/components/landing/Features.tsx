import { motion } from 'framer-motion'
import { Radar, Gauge, Globe2, Plane, Route, Search } from 'lucide-react'

const FEATURES = [
  {
    icon: Radar,
    title: 'Live ADS-B positions',
    desc: 'Aircraft positions from the OpenSky Network, refreshed continuously and smoothed between updates so movement stays fluid.',
  },
  {
    icon: Gauge,
    title: 'Real telemetry',
    desc: 'Altitude, ground speed, heading and vertical rate, exactly as broadcast by the aircraft transponder.',
  },
  {
    icon: Globe2,
    title: 'Worldwide coverage',
    desc: 'Every aircraft transmitting ADS-B within your viewport, from transatlantic crossings to regional hops.',
  },
  {
    icon: Route,
    title: 'Route context',
    desc: 'The typical origin and destination for a callsign, drawn as a great-circle path with distance remaining.',
  },
  {
    icon: Plane,
    title: 'Aircraft details',
    desc: 'Type, manufacturer, registration and operator resolved from the Mode-S address and cached for instant lookup.',
  },
  {
    icon: Search,
    title: 'Instant search',
    desc: 'Filter thousands of live aircraft by callsign, registration, airline, or airport as you type.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold uppercase tracking-widest text-accent"
          >
            Everything you need
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Built for people who love the sky
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted"
          >
            A complete, fast, and beautiful flight-tracking experience — packed with the details
            aviation enthusiasts and travelers actually want.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-white/15"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-sky-glow/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700 to-ink-800 text-accent">
                <feature.icon className="size-5.5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
