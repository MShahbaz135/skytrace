import { describe, expect, it } from 'vitest'
import { countryFromTimezone, viewForCountry } from './visitor-region'

describe('viewForCountry', () => {
  it('frames Pakistan rather than a world view', () => {
    const view = viewForCountry('pk')
    expect(view.zoom).toBeGreaterThanOrEqual(5)
    expect(view.bounds).toBeDefined()
    const [[south, west], [north, east]] = view.bounds!
    expect(south).toBeLessThan(28)
    expect(north).toBeGreaterThan(35)
    expect(west).toBeLessThan(65)
    expect(east).toBeGreaterThan(75)
  })

  it('falls back to provided coordinates when the country is unknown', () => {
    const view = viewForCountry('ZZ', { lat: 1.3, lng: 103.8 })
    expect(view.center).toEqual([1.3, 103.8])
    expect(view.zoom).toBe(6)
  })
})

describe('countryFromTimezone', () => {
  it('maps Asia/Karachi to Pakistan', () => {
    expect(countryFromTimezone('Asia/Karachi')).toBe('PK')
  })
})
