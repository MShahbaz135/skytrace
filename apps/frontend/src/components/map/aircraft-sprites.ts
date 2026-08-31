import type { FlightPhase } from '@skytrace/shared'

/** Plane silhouette pointing north, authored in a 24x24 box. */
const PLANE_PATH =
  'M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z'

export const PHASE_COLOURS: Record<FlightPhase, string> = {
  cruising: '#7dd3fc',
  climbing: '#34d399',
  descending: '#fbbf24',
  'on-ground': '#94a3b8',
}

export const SELECTED_COLOUR = '#22d3ee'

export interface Sprite {
  canvas: HTMLCanvasElement
  /** Offset from the sprite's top-left to its centre, in CSS pixels. */
  anchor: number
}

/**
 * Rasterises the plane glyph once per colour and size.
 *
 * Filling an SVG path for every aircraft on every frame is the single most expensive thing
 * a tracker like this can do. Drawing a cached bitmap instead reduces each aircraft to a
 * transform plus one `drawImage`.
 */
const spriteCache = new Map<string, Sprite>()

export function getPlaneSprite(size: number, colour: string, glow: boolean): Sprite {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const key = `plane|${size}|${colour}|${glow}|${dpr}`
  const cached = spriteCache.get(key)
  if (cached) return cached

  // Padding leaves room for the glow so it is not clipped at the sprite edge.
  const padding = glow ? size * 0.5 : size * 0.15
  const extent = size + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(extent * dpr)
  canvas.height = Math.ceil(extent * dpr)

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
    ctx.translate(extent / 2, extent / 2)
    ctx.scale(size / 24, size / 24)
    ctx.translate(-12, -12)

    if (glow) {
      ctx.shadowColor = colour
      ctx.shadowBlur = 14
    }
    ctx.fillStyle = colour
    ctx.fill(new Path2D(PLANE_PATH))
  }

  const sprite: Sprite = { canvas, anchor: extent / 2 }
  spriteCache.set(key, sprite)
  return sprite
}

export interface LevelOfDetail {
  size: number
}

/**
 * Glyph size scales with zoom. Aircraft stay as oriented planes even when the view is
 * pulled back to a continent or a long-haul route — dots made a selected flight look like
 * it had disappeared.
 */
export function levelOfDetail(zoom: number): LevelOfDetail {
  if (zoom < 5) return { size: 22 }
  if (zoom < 7) return { size: 28 }
  if (zoom < 9) return { size: 36 }
  return { size: 48 }
}
