// Connects to the live stream like a browser would, sends one viewport, and reports
// what comes back. Used to sanity-check the gateway without opening the UI.
//   node scripts/smoke-stream.mjs [port] [seconds]
import { io } from 'socket.io-client'

const port = Number(process.argv[2] ?? 3000)
const seconds = Number(process.argv[3] ?? 30)

// Western Europe: dense traffic, and small enough to cost a single OpenSky credit.
const bbox = { south: 45, west: -5, north: 55, east: 10 }

const socket = io(`http://localhost:${port}/stream`, { transports: ['websocket'] })

let snapshots = 0
let deltas = 0
let tracked = 0

socket.on('connect', () => {
  console.log(`connected as ${socket.id}`)
  socket.emit('viewport:set', { bbox, zoom: 6 })
})

socket.on('stream:status', (status) => {
  console.log('status  ', JSON.stringify(status))
})

socket.on('states:snapshot', (payload) => {
  snapshots += 1
  tracked = payload.aircraft.length
  console.log(`snapshot  ${payload.aircraft.length} aircraft`)
  if (payload.aircraft[0]) console.log('sample  ', JSON.stringify(payload.aircraft[0]))
})

socket.on('states:delta', (payload) => {
  deltas += 1
  console.log(`delta     +${payload.updated.length} / -${payload.removed.length}`)
  if (deltas === 1 && payload.updated[0]) {
    console.log('sample  ', JSON.stringify(payload.updated[0]))
  }
})

let enrichedCount = 0
let withRoute = 0

socket.on('aircraft:enriched', (payload) => {
  enrichedCount += payload.items.length
  for (const item of payload.items) if (item.route) withRoute += 1

  const sample = payload.items.find((item) => item.route) ?? payload.items[0]
  if (sample) {
    const route = sample.route
      ? `${sample.route.origin.iata ?? sample.route.origin.icao} -> ${sample.route.destination.iata ?? sample.route.destination.icao}`
      : 'route unknown'
    console.log(
      `enriched  +${payload.items.length}  e.g. ${sample.callsign ?? sample.icao24} ` +
        `${sample.aircraft?.type ?? 'unknown type'} (${sample.aircraft?.registration ?? '?'}) ${route}`,
    )
  }
})

socket.on('connect_error', (error) => {
  console.error('connect_error', error.message)
})

setTimeout(() => {
  console.log(
    `\nsnapshots=${snapshots} deltas=${deltas} lastSnapshotSize=${tracked} ` +
      `enriched=${enrichedCount} withRoute=${withRoute}`,
  )
  socket.close()
  process.exit(0)
}, seconds * 1000)
