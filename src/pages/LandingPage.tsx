import { Hero } from '@/components/landing/Hero'
import { LiveStats } from '@/components/landing/LiveStats'
import { Features } from '@/components/landing/Features'
import { MapShowcase } from '@/components/landing/MapShowcase'
import { CTA } from '@/components/landing/CTA'

export function LandingPage() {
  return (
    <>
      <Hero />
      <LiveStats />
      <Features />
      <MapShowcase />
      <CTA />
    </>
  )
}
