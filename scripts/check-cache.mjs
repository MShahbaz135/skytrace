// Reports what the enrichment cache has persisted. Handy for confirming the adsbdb
// pipeline is writing through to Postgres rather than only living in memory.
//   node scripts/check-cache.mjs
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const envPath = path.join(process.cwd(), 'apps/backend/.env')
if (!fs.existsSync(envPath)) {
  console.log('No apps/backend/.env found, nothing to check.')
  process.exit(0)
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

if (!env.DB_HOST) {
  console.log('DB_HOST is unset, enrichment is running in memory-only mode.')
  process.exit(0)
}

const client = new pg.Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
})

try {
  await client.connect()

  for (const table of ['aircraft', 'flight_route', 'airport']) {
    const { rows } = await client.query(`select count(*)::int as n from ${table}`)
    console.log(`${table.padEnd(14)} ${rows[0].n}`)
  }

  const sample = await client.query(
    `select callsign, "airlineName", "originIcao", "destinationIcao"
     from flight_route where found = true limit 5`,
  )
  console.table(sample.rows)

  const aircraft = await client.query(
    `select icao24, registration, type from aircraft where found = true limit 5`,
  )
  console.table(aircraft.rows)
} catch (error) {
  console.error('DB check failed:', error.message)
} finally {
  await client.end().catch(() => {})
}
