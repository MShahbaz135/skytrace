// Writes a recorded-looking slice of Western European traffic so the replay fallback
// and the README recording can run without OpenSky credentials.
import fs from 'node:fs'
import path from 'node:path'

const outputPath = path.join(process.cwd(), 'apps/backend/fixtures/states-replay.json')

const AIRLINES = [
  ['BAW', 'United Kingdom'],
  ['AFR', 'France'],
  ['DLH', 'Germany'],
  ['RYR', 'Ireland'],
  ['EZY', 'United Kingdom'],
  ['KLM', 'Netherlands'],
  ['IBE', 'Spain'],
  ['AZA', 'Italy'],
  ['SAS', 'Sweden'],
  ['THY', 'Turkey'],
  ['UAE', 'United Arab Emirates'],
  ['EIN', 'Ireland'],
  ['TAP', 'Portugal'],
  ['LOT', 'Poland'],
  ['WZZ', 'Hungary'],
  ['SWR', 'Switzerland'],
  ['AUA', 'Austria'],
  ['BEL', 'Belgium'],
  ['NAX', 'Norway'],
  ['FIN', 'Finland'],
]

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260827)
const now = Math.floor(Date.now() / 1000)

const states = Array.from({ length: 96 }, (_, i) => {
  const [prefix, country] = AIRLINES[i % AIRLINES.length]
  const airborne = rand() > 0.08
  const lat = 43 + rand() * 13
  const lng = -8 + rand() * 26
  const heading = rand() * 360
  const speed = airborne ? 180 + rand() * 90 : 0
  const climb = airborne ? (rand() - 0.5) * 12 : 0
  const icao24 = (0x300000 + i * 7919).toString(16).padStart(6, '0').slice(-6)

  return {
    icao24,
    callsign: `${prefix}${String(100 + ((i * 17) % 800)).padStart(3, '0')}`,
    originCountry: country,
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    baroAltitude: airborne ? Math.round(7000 + rand() * 5000) : 0,
    geoAltitude: airborne ? Math.round(7200 + rand() * 5000) : 0,
    velocity: airborne ? Number(speed.toFixed(1)) : 0,
    trueTrack: Number(heading.toFixed(1)),
    verticalRate: airborne ? Number(climb.toFixed(1)) : 0,
    onGround: !airborne,
    lastContact: now,
    timePosition: now,
    squawk: String(1000 + ((i * 37) % 7000)).padStart(4, '0'),
  }
})

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      bbox: { south: 42, west: -8, north: 56, east: 18 },
      states,
    },
    null,
    2,
  )}\n`,
)

console.log(`Wrote ${states.length} aircraft to ${path.relative(process.cwd(), outputPath)}`)
