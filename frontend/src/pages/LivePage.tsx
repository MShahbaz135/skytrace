import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, Plane, List, X } from 'lucide-react'
import { FLIGHTS, STATUS_META, type FlightStatus } from '@/data/flights'
import { FlightMap } from '@/components/map/FlightMap'
import { FlightCard } from '@/components/flights/FlightCard'
import { FlightDetailPanel } from '@/components/flights/FlightDetailPanel'
import { cn } from '@/lib/utils'

const FILTERS: Array<{ value: FlightStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'en-route', label: 'En route' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'landed', label: 'Landed' },
]

export function LivePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FlightStatus | 'all'>('all')
  const [listOpen, setListOpen] = useState(false)

  const flights = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FLIGHTS.filter((f) => {
      const matchesFilter = filter === 'all' || f.status === filter
      const matchesQuery =
        !q ||
        f.flightNumber.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.origin.city.toLowerCase().includes(q) ||
        f.destination.city.toLowerCase().includes(q) ||
        f.origin.iata.toLowerCase().includes(q) ||
        f.destination.iata.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [query, filter])

  const selected = useMemo(
    () => FLIGHTS.find((f) => f.id === selectedId) ?? null,
    [selectedId],
  )

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setListOpen(false)
  }

  return (
    <div className="fixed inset-0 top-0 flex pt-[72px]">
      {/* Sidebar / list */}
      <aside
        className={cn(
          'absolute inset-y-0 top-[72px] z-30 flex w-full max-w-sm flex-col border-r border-white/8 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-ink-900/60',
          listOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/8 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">Live flights</h1>
              <p className="text-xs text-muted">
                <span className="text-signal">{flights.length}</span> aircraft matching
              </p>
            </div>
            <button
              type="button"
              onClick={() => setListOpen(false)}
              className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flight, city or airport…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            <SlidersHorizontal className="size-3.5 shrink-0 text-muted-dim" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-white/10 bg-white/5 text-muted hover:text-white',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {flights.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Plane className="size-8 text-muted-dim" />
              <p className="mt-3 text-sm text-muted">No flights match your search.</p>
            </div>
          ) : (
            flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                active={flight.id === selectedId}
                onClick={() => handleSelect(flight.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Map */}
      <main className="relative flex-1">
        <FlightMap
          flights={flights}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="size-full"
        />

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] hidden items-center gap-4 rounded-xl glass px-4 py-2.5 text-xs text-muted sm:flex">
          {(['en-route', 'boarding', 'delayed', 'landed'] as FlightStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>

        {/* Mobile open-list button */}
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="absolute left-4 top-4 z-[400] flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden"
        >
          <List className="size-4" />
          Flights ({flights.length})
        </button>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute inset-y-4 right-4 z-[450] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-3xl glass-strong shadow-2xl shadow-black/50 sm:w-96"
            >
              <FlightDetailPanel flight={selected} onClose={() => setSelectedId(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
