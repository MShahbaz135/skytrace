import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radar } from 'lucide-react'

export function CTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 px-6 py-16 text-center sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
          <div className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-sky-glow/20 blur-[120px]" />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to watch the world fly?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Jump into the live map and start tracking flights across the globe — no sign-up
              required.
            </p>
            <Link
              to="/live"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-soft to-accent px-7 py-4 text-base font-semibold text-ink-950 shadow-xl shadow-sky-glow/25 transition-all hover:brightness-110"
            >
              <Radar className="size-5" />
              Launch Live Map
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
