import { useEffect, useMemo, useState } from 'react'
import { Hero } from '@/components/landing/Hero'
import { LiveStats, type CoverageStats } from '@/components/landing/LiveStats'
import { Features } from '@/components/landing/Features'
import { MapShowcase } from '@/components/landing/MapShowcase'
import { CTA } from '@/components/landing/CTA'
import { useLiveAircraft } from '@/hooks/useLiveAircraft'
import { toAircraftView } from '@/lib/aircraft-view'

function countDistinct<T>(items: T[], pick: (item: T) => string | null | undefined): number | null {
  const set = new Set<string>()
  for (const item of items) {
    const value = pick(item)
    if (value) set.add(value)
  }
  return set.size > 0 ? set.size : null
}

export function LandingPage() {
  const feed = useLiveAircraft()
  const [featuredId, setFeaturedId] = useState<string | null>(null)

  const views = useMemo(
    () => Array.from(feed.aircraft.values(), toAircraftView),
    [feed.aircraft],
  )

  // The hero card sticks with one aircraft rather than reshuffling on every update, and
  // only swaps once a better-documented candidate appears or the current one leaves.
  useEffect(() => {
    const current = featuredId ? views.find((view) => view.icao24 === featuredId) : undefined
    if (current?.route) return

    const better =
      views.find((view) => view.route && view.photoThumbnailUrl) ??
      views.find((view) => view.route) ??
      (current ? undefined : views[0])

    if (better) setFeaturedId(better.icao24)
  }, [views, featuredId])

  const featured = useMemo(
    () => views.find((view) => view.icao24 === featuredId) ?? null,
    [views, featuredId],
  )

  const stats = useMemo<CoverageStats>(
    () => ({
      aircraft: feed.aircraft.size > 0 ? feed.aircraft.size : null,
      airlines: countDistinct(views, (view) => view.airlineName),
      countries: countDistinct(views, (view) => view.originCountry),
      airports: countDistinct(views, (view) => view.route?.destination.icao),
    }),
    [views, feed.aircraft.size],
  )

  return (
    <>
      <Hero featured={featured} aircraftCount={feed.aircraft.size} />
      <LiveStats stats={stats} />
      <Features />
      <MapShowcase feed={feed} views={views} />
      <CTA />
    </>
  )
}
