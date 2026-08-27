// Captures README screenshots and a short screen recording of the live map.
//
// Expects:
//   backend on :3000 with REPLAY_MODE=always
//   frontend on :5173 with VITE_API_URL=http://localhost:3000
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const docsDir = path.join(process.cwd(), 'docs')
const shotsDir = path.join(docsDir, 'screenshots')
fs.mkdirSync(shotsDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(docsDir, '.video-tmp'), size: { width: 1440, height: 900 } },
})
const page = await context.newPage()

await page.goto(`${frontend}/live`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await page.getByText(/Demo data|Live/).first().waitFor({ timeout: 30_000 })
await page.waitForTimeout(4000)

await page.screenshot({
  path: path.join(shotsDir, 'live.png'),
  type: 'png',
})

const map = page.locator('.leaflet-container')
const box = await map.boundingBox()
if (box) {
  const x = box.x + box.width * 0.55
  const y = box.y + box.height * 0.45
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 180, y + 40, { steps: 24 })
  await page.mouse.up()
  await page.waitForTimeout(1500)
  await page.mouse.wheel(0, -240)
  await page.waitForTimeout(2000)
}

await page.screenshot({
  path: path.join(shotsDir, 'live-zoomed.png'),
  type: 'png',
})

await page.goto(`${frontend}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await page.waitForTimeout(2500)
await page.screenshot({
  path: path.join(shotsDir, 'landing.png'),
  type: 'png',
})

await page.locator('#coverage').scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
await page.screenshot({
  path: path.join(shotsDir, 'landing-map.png'),
  type: 'png',
})

await context.close()
await browser.close()

const tmpDir = path.join(docsDir, '.video-tmp')
const videos = fs.existsSync(tmpDir)
  ? fs.readdirSync(tmpDir).filter((name) => name.endsWith('.webm'))
  : []

if (videos.length === 0) {
  console.warn('No Playwright video was written.')
  process.exit(0)
}

const src = path.join(tmpDir, videos[0])
const dest = path.join(docsDir, 'preview.webm')
fs.copyFileSync(src, dest)
fs.rmSync(tmpDir, { recursive: true, force: true })
console.log(`Wrote ${path.relative(process.cwd(), dest)}`)
console.log(`Wrote screenshots under ${path.relative(process.cwd(), shotsDir)}`)
