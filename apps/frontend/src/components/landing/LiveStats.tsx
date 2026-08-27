import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { formatCompact } from '@/lib/utils'

function AnimatedCounter({ value }: { value: number | null }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView || value === null) return
    const duration = 1400
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  return <span ref={ref}>{value === null ? '—' : formatCompact(display)}</span>
}

export interface CoverageStats {
  aircraft: number | null
  airlines: number | null
  countries: number | null
  airports: number | null
}

export function LiveStats({ stats }: { stats: CoverageStats }) {
  const items = [
    { value: stats.aircraft, label: 'Aircraft tracked now' },
    { value: stats.airlines, label: 'Airlines in view' },
    { value: stats.countries, label: 'Countries of origin' },
    { value: stats.airports, label: 'Airports on known routes' },
  ]

  return (
    <section className="relative border-y border-white/5 bg-ink-900/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
        {items.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="px-4 py-10 text-center"
          >
            <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              <AnimatedCounter value={stat.value} />
            </p>
            <p className="mt-2 text-sm text-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
