import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, Plane, List, X } from 'lucide-react'
import type { AircraftState, FlightPhase } from '@skytrace/shared'
import { useLiveAircraft } from '@/hooks/useLiveAircraft'
import { PHASE_META, PHASE_ORDER, matchesQuery, toAircraftView } from '@/lib/aircraft-view'
import { FlightMap } from '@/components/map/FlightMap'
import { FlightCard } from '@/components/flights/FlightCard'
import { FlightDetailPanel } from '@/components/flights/FlightDetailPanel'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'
import { cn, formatNumber } from '@/lib/utils'

const FILTERS: Array<{ value: FlightPhase | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...PHASE_ORDER.map((phase) => ({ value: phase, label: PHASE_META[phase].label })),
]

/**
 * A busy viewport holds thousands of aircraft. The map draws them all, but the sidebar is
 * DOM and would choke, so it shows a bounded slice and says so.
 */
const MAX_LISTED = 150

export function LivePage() {
  const { aircraft, interpolator, status, connected, setViewport } = useLiveAircraft()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FlightPhase | 'all'>('all')
  const [listOpen, setListOpen] = useState(false)

  const states = useMemo(() => {
    const map = new Map<string, AircraftState>()
    for (const [icao24, tracked] of aircraft) map.set(icao24, tracked.state)
    return map
  }, [aircraft])

  const matching = useMemo(() => {
    const views = []
    for (const tracked of aircraft.values()) {
      const view = toAircraftView(tracked)
      if (filter !== 'all' && view.phase !== filter) continue
      if (!matchesQuery(view, query)) continue
      views.push(view)
    }
    // Sorted by label rather than by enrichment state, so rows do not jump around as
    // adsbdb answers arrive.
    views.sort((a, b) => a.label.localeCompare(b.label))
    return views
  }, [aircraft, filter, query])

  const listed = matching.slice(0, MAX_LISTED)

  const selectedTracked = selectedId ? (aircraft.get(selectedId) ?? null) : null
  const selectedView = selectedTracked ? toAircraftView(selectedTracked) : null

  const handleSelect = (icao24: string | null) => {
    setSelectedId(icao24)
    if (icao24) setListOpen(false)
  }

  return (
    <div className="fixed inset-0 top-0 flex pt-[72px]">
      <aside
        className={cn(
          'absolute inset-y-0 top-[72px] z-30 flex w-full max-w-sm flex-col border-r border-white/8 bg-ink-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-ink-900/60',
          listOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/8 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">Live aircraft</h1>
              <p className="text-xs text-muted">
                <span className="text-signal">{formatNumber(matching.length)}</span> in view
                {aircraft.size !== matching.length && (
                  <> of {formatNumber(aircraft.size)} tracked</>
                )}
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
              placeholder="Callsign, registration, airline, airport…"
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
          {listed.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Plane className="size-8 text-muted-dim" />
              <p className="mt-3 text-sm text-muted">
                {aircraft.size === 0
                  ? 'Waiting for the first position update…'
                  : 'No aircraft match your search.'}
              </p>
            </div>
          ) : (
            <>
              {listed.map((view) => (
                <FlightCard
                  key={view.icao24}
                  view={view}
                  active={view.icao24 === selectedId}
                  onClick={() => handleSelect(view.icao24)}
                />
              ))}
              {matching.length > listed.length && (
                <p className="py-3 text-center text-xs text-muted-dim">
                  Showing {formatNumber(listed.length)} of {formatNumber(matching.length)}. Zoom
                  in or search to narrow the list.
                </p>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="relative flex-1">
        <FlightMap
          states={states}
          interpolator={interpolator}
          selected={selectedTracked}
          selectedId={selectedId}
          onSelect={handleSelect}
          onViewportChange={setViewport}
          className="size-full"
        />

        <div className="pointer-events-none absolute right-4 top-4 z-[400] flex justify-end">
          <ConnectionStatus connected={connected} status={status} />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] hidden items-center gap-4 rounded-xl glass px-4 py-2.5 text-xs text-muted sm:flex">
          {PHASE_ORDER.map((phase) => (
            <span key={phase} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', PHASE_META[phase].dot)} />
              {PHASE_META[phase].label}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="absolute left-4 top-4 z-[400] flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden"
        >
          <List className="size-4" />
          Aircraft ({formatNumber(matching.length)})
        </button>

        <AnimatePresence>
          {selectedView && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute inset-y-4 right-4 z-[450] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-3xl glass-strong shadow-2xl shadow-black/50 sm:w-96"
            >
              <FlightDetailPanel view={selectedView} onClose={() => setSelectedId(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
