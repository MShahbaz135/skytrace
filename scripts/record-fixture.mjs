// Records a slice of live traffic into the replay fixture the backend falls back to when
// OpenSky is unreachable or out of credits.
//
//   node scripts/record-fixture.mjs [port] [timeoutSeconds]
//
// Requires a running backend with a working upstream feed.
import fs from 'node:fs'
import path from 'node:path'
import { io } from 'socket.io-client'

const port = Number(process.argv[2] ?? 3000)
const timeoutSeconds = Number(process.argv[3] ?? 90)

// Western Europe at peak: dense enough to look convincing, small enough to cost one credit.
const bbox = { south: 42, west: -6, north: 56, east: 16 }

const outputPath = path.join(process.cwd(), 'apps/backend/fixtures/states-replay.json')
const socket = io(`http://localhost:${port}/stream`, { transports: ['websocket'] })

const collected = new Map()

function finish(reason) {
  if (collected.size === 0) {
    console.error(`No aircraft captured (${reason}). Is the upstream feed working?`)
    socket.close()
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        bbox,
        states: [...collected.values()],
      },
      null,
      2,
    )}\n`,
  )

  console.log(`Wrote ${collected.size} aircraft to ${path.relative(process.cwd(), outputPath)}`)
  socket.close()
  process.exit(0)
}

socket.on('connect', () => {
  console.log('Connected, requesting viewport…')
  socket.emit('viewport:set', { bbox, zoom: 5 })
})

socket.on('states:snapshot', (payload) => {
  for (const state of payload.aircraft) collected.set(state.icao24, state)
})

socket.on('states:delta', (payload) => {
  for (const state of payload.updated) collected.set(state.icao24, state)
  console.log(`Captured ${collected.size} aircraft`)
  // One full frame is enough: the replay source advances aircraft along their own tracks.
  if (collected.size > 0) finish('first delta')
})

socket.on('stream:status', (status) => {
  if (status.source === 'replay') {
    console.error('Backend is already serving replay data; refusing to record it.')
    socket.close()
    process.exit(1)
  }
})

socket.on('connect_error', (error) => {
  console.error('Could not reach the backend:', error.message)
  process.exit(1)
})

setTimeout(() => finish('timeout'), timeoutSeconds * 1000)
