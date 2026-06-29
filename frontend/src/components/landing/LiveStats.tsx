import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { GLOBAL_STATS } from '@/data/flights'
import { formatCompact } from '@/lib/utils'

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
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

  return <span ref={ref}>{formatCompact(display)}</span>
}

const STATS = [
  { value: GLOBAL_STATS.flightsTracked, label: 'Flights tracked live', suffix: '+' },
  { value: GLOBAL_STATS.airportsCovered, label: 'Airports covered', suffix: '+' },
  { value: GLOBAL_STATS.airlines, label: 'Airlines monitored', suffix: '+' },
  { value: GLOBAL_STATS.countries, label: 'Countries & regions', suffix: '' },
]

export function LiveStats() {
  return (
    <section className="relative border-y border-white/5 bg-ink-900/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
        {STATS.map((stat, i) => (
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
              <span className="text-gradient">{stat.suffix}</span>
            </p>
            <p className="mt-2 text-sm text-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
